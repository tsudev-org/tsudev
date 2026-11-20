-- PRO2 - kênh trạng thái quyền lợi (tsudev-standards PRODUCT_POLICY 7.4, docs/adr/0004).
-- Chống máy chủ đồng bộ xoá nhầm bản sao đám mây của người đã gia hạn trên web nhưng
-- không mở app: kênh trạng thái phải trả lời cho MỌI `sub` đã từng cấp quyền cho client,
-- kể cả khi grant OIDC (30 ngày) đã hết, và trả `deleted` cho tài khoản đã xoá.

-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "statusDelegateFor" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "RpSubject" (
    "clientId" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "firstGrantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RpSubject_pkey" PRIMARY KEY ("clientId","sub")
);

-- CreateTable
CREATE TABLE "DeletedSubject" (
    "sub" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedSubject_pkey" PRIMARY KEY ("sub")
);

-- CreateIndex
CREATE INDEX "RpSubject_sub_idx" ON "RpSubject"("sub");

-- CreateIndex
CREATE INDEX "DeletedSubject_deletedAt_idx" ON "DeletedSubject"("deletedAt");

-- Trigger 1: mỗi Grant OIDC được ghi (đồng ý lần đầu, cấp lại) ⇒ nhớ cặp (client, sub).
-- Ở tầng CSDL chứ không ở adapter: grant tạo bằng đường nào cũng được nhớ.
CREATE FUNCTION tsudev_rp_subject_from_grant() RETURNS trigger AS $$
BEGIN
  IF NEW.payload->>'clientId' IS NOT NULL AND NEW.payload->>'accountId' IS NOT NULL THEN
    INSERT INTO "RpSubject" ("clientId", "sub")
    VALUES (NEW.payload->>'clientId', NEW.payload->>'accountId')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oidc_grant_rp_subject
  AFTER INSERT OR UPDATE ON "OidcPayload"
  FOR EACH ROW WHEN (NEW.type = 'Grant')
  EXECUTE FUNCTION tsudev_rp_subject_from_grant();

-- Trigger 2: xoá tài khoản bằng BẤT KỲ đường nào ⇒ để lại dấu `sub` đã xoá.
CREATE FUNCTION tsudev_deleted_subject() RETURNS trigger AS $$
BEGIN
  INSERT INTO "DeletedSubject" ("sub") VALUES (OLD.id)
  ON CONFLICT ("sub") DO UPDATE SET "deletedAt" = CURRENT_TIMESTAMP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deleted_subject
  AFTER DELETE ON "User"
  FOR EACH ROW EXECUTE FUNCTION tsudev_deleted_subject();

-- Nạp ngược từ các Grant còn trong bảng (kể cả đã hết hạn nhưng chưa bị dọn).
INSERT INTO "RpSubject" ("clientId", "sub")
SELECT DISTINCT payload->>'clientId', payload->>'accountId'
FROM "OidcPayload"
WHERE type = 'Grant'
  AND payload->>'clientId' IS NOT NULL
  AND payload->>'accountId' IS NOT NULL
ON CONFLICT DO NOTHING;
