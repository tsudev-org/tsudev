-- P4 OIDC (D1): trạng thái oidc-provider + client đăng ký. Chỉ THÊM.

-- CreateTable
CREATE TABLE "OidcPayload" (
    "type" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "grantId" TEXT,
    "userCode" TEXT,
    "uid" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "OidcPayload_pkey" PRIMARY KEY ("type","id")
);

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "postLogoutRedirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY['profile', 'email']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OidcPayload_grantId_idx" ON "OidcPayload"("grantId");

-- CreateIndex
CREATE INDEX "OidcPayload_uid_idx" ON "OidcPayload"("uid");

-- CreateIndex
CREATE INDEX "OidcPayload_expiresAt_idx" ON "OidcPayload"("expiresAt");


-- Thu hồi OIDC theo sessionVersion (P4): MỌI đường tăng sessionVersion (đổi mật khẩu,
-- "đăng xuất mọi thiết bị", nút "Không phải tôi", OWNER thu hồi) xoá luôn phiên,
-- grant, mã và token OIDC của người đó. Đặt ở DB để không đường nào quên gọi.
CREATE OR REPLACE FUNCTION tsudev_oidc_revoke_on_session_version() RETURNS trigger AS $$
BEGIN
  IF NEW."sessionVersion" IS DISTINCT FROM OLD."sessionVersion" THEN
    DELETE FROM "OidcPayload" WHERE "payload"->>'accountId' = NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsudev_oidc_revoke_on_session_version
AFTER UPDATE OF "sessionVersion" ON "User"
FOR EACH ROW EXECUTE FUNCTION tsudev_oidc_revoke_on_session_version();
