-- Trung tâm an ninh phát hành - B1 (docs/security-plan.md §3, phiếu 20261105-04 §3).
--
-- 1. ProjectRelease: cột trạng thái an ninh, kiểm toàn vẹn, thu hồi, kết quả quét.
-- 2. TrustAuditLog + SecurityEvent: CHỈ-THÊM (G8) + chuỗi băm `prevHash`.
--
-- ⚠️ Phát hành: `db:migrate` lên Neon TRƯỚC khi merge (CLAUDE.md). Migration này
-- không DROP gì, nhưng có UPDATE điền ngược `prevHash` - vẫn `pg_dump` trước.
--
-- Giới hạn trung thực: trigger chặn ỨNG DỤNG (mọi đường Prisma, SQL injection qua
-- vai trò của ứng dụng, lỡ tay). Nó KHÔNG chặn chủ CSDL - ai có quyền DROP TRIGGER
-- thì xoá được dấu vết. Chuỗi băm là lớp thứ hai: xoá một dòng ở GIỮA làm đứt
-- chuỗi và trang kiểm tra chỉ ra chỗ đứt. Xoá dòng CUỐI thì chuỗi không lộ - cần
-- neo bên ngoài (đề xuất giai đoạn 3).

-- CreateEnum
CREATE TYPE "ReleaseSecurityState" AS ENUM ('OK', 'LECH_TOAN_VEN', 'NGHI_MA_DOC');

-- AlterTable
ALTER TABLE "ProjectRelease" ADD COLUMN     "lastIntegrityAt" TIMESTAMP(3),
ADD COLUMN     "revokeReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "scanResult" JSONB,
ADD COLUMN     "securityState" "ReleaseSecurityState" NOT NULL DEFAULT 'OK';

-- AlterTable
ALTER TABLE "SecurityEvent" ADD COLUMN     "prevHash" TEXT;

-- AlterTable
ALTER TABLE "TrustAuditLog" ADD COLUMN     "prevHash" TEXT;

-- CreateIndex
CREATE INDEX "ProjectRelease_securityState_idx" ON "ProjectRelease"("securityState");

-- ---------------------------------------------------------------------------
-- Băm một dòng. Phủ MỌI cột kể cả `prevHash` của chính dòng đó, nên băm của dòng
-- N phụ thuộc toàn bộ dòng 1..N. `json_build_array` cho ra văn bản xác định,
-- không lẫn ranh giới giữa các trường (khác với nối chuỗi trần).
-- Thời điểm in theo định dạng cố định, không theo DateStyle của phiên.
-- ---------------------------------------------------------------------------
CREATE FUNCTION tsudev_trust_audit_hash(r "TrustAuditLog") RETURNS text AS $$
  SELECT encode(sha256(convert_to(json_build_array(
    r.id, r."actorId", r."actorName", r.action, r."targetType", r."targetId",
    r."targetLabel", r.note,
    to_char(r."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    r."prevHash"
  )::text, 'UTF8')), 'hex')
$$ LANGUAGE sql IMMUTABLE;

CREATE FUNCTION tsudev_security_event_hash(r "SecurityEvent") RETURNS text AS $$
  SELECT encode(sha256(convert_to(json_build_array(
    r.id, r."userId", r."actorId", r."actorName", r.type, r.ip, r.country,
    r."userAgent", r.note,
    to_char(r."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    r."prevHash"
  )::text, 'UTF8')), 'hex')
$$ LANGUAGE sql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- Điền ngược chuỗi cho dữ liệu có sẵn (TRƯỚC khi gắn trigger chặn UPDATE).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r "TrustAuditLog";
  prev_hash text := NULL;
BEGIN
  FOR r IN SELECT * FROM "TrustAuditLog" ORDER BY "createdAt", id LOOP
    UPDATE "TrustAuditLog" SET "prevHash" = prev_hash WHERE id = r.id;
    r."prevHash" := prev_hash;
    prev_hash := tsudev_trust_audit_hash(r);
  END LOOP;
END $$;

DO $$
DECLARE
  r "SecurityEvent";
  prev_user text := NULL;
  prev_hash text := NULL;
BEGIN
  FOR r IN SELECT * FROM "SecurityEvent" ORDER BY "userId", "createdAt", id LOOP
    IF prev_user IS DISTINCT FROM r."userId" THEN
      prev_hash := NULL;
      prev_user := r."userId";
    END IF;
    UPDATE "SecurityEvent" SET "prevHash" = prev_hash WHERE id = r.id;
    r."prevHash" := prev_hash;
    prev_hash := tsudev_security_event_hash(r);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- INSERT: nối vào chuỗi.
--
-- Khoá advisory theo giao dịch tuần tự hoá các lượt chèn cùng chuỗi; câu SELECT
-- sau PERFORM chạy với snapshot MỚI (hàm VOLATILE, READ COMMITTED) nên thấy dòng
-- giao dịch trước vừa commit. `createdAt` do trigger đặt bằng giờ thật, tăng
-- NGHIÊM NGẶT (+1 ms nếu trùng): thứ tự (createdAt, id) dùng để kiểm chuỗi phải
-- trùng thứ tự chèn - now() là giờ BẮT ĐẦU giao dịch nên không đảm bảo điều đó.
-- Cột là TIMESTAMP(3) không múi giờ, Prisma đọc như UTC ⇒ quy về UTC.
-- ---------------------------------------------------------------------------
CREATE FUNCTION tsudev_trust_audit_chain() RETURNS trigger AS $$
DECLARE
  prev "TrustAuditLog";
  now_utc timestamp(3) := (clock_timestamp() AT TIME ZONE 'UTC');
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tsudev:TrustAuditLog'));
  SELECT * INTO prev FROM "TrustAuditLog" ORDER BY "createdAt" DESC, id DESC LIMIT 1;
  IF FOUND THEN
    NEW."createdAt" := GREATEST(now_utc, prev."createdAt" + interval '1 millisecond');
    NEW."prevHash" := tsudev_trust_audit_hash(prev);
  ELSE
    NEW."createdAt" := now_utc;
    NEW."prevHash" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE FUNCTION tsudev_security_event_chain() RETURNS trigger AS $$
DECLARE
  prev "SecurityEvent";
  now_utc timestamp(3) := (clock_timestamp() AT TIME ZONE 'UTC');
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tsudev:SecurityEvent:' || NEW."userId"));
  SELECT * INTO prev FROM "SecurityEvent"
    WHERE "userId" = NEW."userId"
    ORDER BY "createdAt" DESC, id DESC LIMIT 1;
  IF FOUND THEN
    NEW."createdAt" := GREATEST(now_utc, prev."createdAt" + interval '1 millisecond');
    NEW."prevHash" := tsudev_security_event_hash(prev);
  ELSE
    NEW."createdAt" := now_utc;
    NEW."prevHash" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE TRIGGER trust_audit_log_chain
  BEFORE INSERT ON "TrustAuditLog"
  FOR EACH ROW EXECUTE FUNCTION tsudev_trust_audit_chain();

CREATE TRIGGER security_event_chain
  BEFORE INSERT ON "SecurityEvent"
  FOR EACH ROW EXECUTE FUNCTION tsudev_security_event_chain();

-- ---------------------------------------------------------------------------
-- UPDATE / DELETE / TRUNCATE: chặn.
--
-- SecurityEvent có HAI đường xoá hợp lệ, cả hai cắt trọn đầu chuỗi của một user:
--   - tự dọn của auth-service (logSecurity): dòng quá 90 ngày. Trigger cho qua
--     dòng quá 90 ngày TRỪ 1 giờ - lệch đồng hồ app/DB không được làm lượt dọn
--     hỏng cả câu lệnh.
--   - cascade khi xoá User (purge tài khoản quá hạn, OWNER xoá tài khoản): xoá
--     do trigger RI của khoá ngoại phát ra chạy ở pg_trigger_depth() > 1; lệnh
--     DELETE trực tiếp chạy ở độ sâu 1.
--
-- `tsudev.allow_audit_purge = 'on'` (SET LOCAL trong một giao dịch) mở khoá -
-- cùng khuôn với `tsudev.allow_hard_delete`. CHỈ cho dọn dữ liệu test local.
-- ---------------------------------------------------------------------------
CREATE FUNCTION tsudev_audit_append_only() RETURNS trigger AS $$
BEGIN
  IF current_setting('tsudev.allow_audit_purge', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'SecurityEvent' AND TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN
      RETURN OLD;
    END IF;
    IF OLD."createdAt" < (now() AT TIME ZONE 'UTC') - interval '90 days' + interval '1 hour' THEN
      RETURN OLD;
    END IF;
  END IF;

  RAISE EXCEPTION
    'Nhật ký % là CHỈ-THÊM: % bị chặn ở cấp database.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege',
          HINT = 'Xem docs/security-plan.md §3.3 mục 5 (G8).';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION tsudev_audit_no_truncate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Nhật ký % là CHỈ-THÊM: TRUNCATE bị chặn ở cấp database.', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trust_audit_log_append_only
  BEFORE UPDATE OR DELETE ON "TrustAuditLog"
  FOR EACH ROW EXECUTE FUNCTION tsudev_audit_append_only();

CREATE TRIGGER security_event_append_only
  BEFORE UPDATE OR DELETE ON "SecurityEvent"
  FOR EACH ROW EXECUTE FUNCTION tsudev_audit_append_only();

CREATE TRIGGER trust_audit_log_no_truncate
  BEFORE TRUNCATE ON "TrustAuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION tsudev_audit_no_truncate();

CREATE TRIGGER security_event_no_truncate
  BEFORE TRUNCATE ON "SecurityEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION tsudev_audit_no_truncate();
