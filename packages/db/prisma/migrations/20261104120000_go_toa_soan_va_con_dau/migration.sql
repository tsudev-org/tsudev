-- Gỡ Toà soạn Agent AI (§8 C3) và Con dấu tín nhiệm (§7 B4) - docs/refactor-tsudev-2026-q4.md
--
-- 🔴 MIGRATION CÓ DROP ĐẦU TIÊN CỦA REPO. Không quay lui bằng mã được: dữ liệu
-- của 17 bảng dưới đây mất hẳn. Thứ tự BẮT BUỘC:
--   1. Xuất backup Neon (pg_dump) TRƯỚC.
--   2. `prisma migrate deploy` lên Neon.
--   3. Merge mã vào main SAU.
-- Đảo 2 và 3 thì Prisma client mới vẫn chạy được trên DB cũ (chỉ thiếu bảng nó
-- không còn dùng), nhưng migrationGate của backend-bundle sẽ exit(1) vì thấy
-- migration chưa áp - site sập.
--
-- GIỮ có chủ đích:
--   * "TrustAuditLog" - auth-service dùng làm nhật ký quản trị tài khoản.
--   * Giá trị VIP, AUTHOR trong enum "Role" - Postgres không DROP VALUE được.
--   * "Post"/"Doc".authoredByAgentId, sourceDraftId - cột trống vô hại, gỡ là
--     một đợt RENAME/DROP riêng không đáng rủi ro lúc này.
-- Trigger chặn xoá cứng gắn trên các bảng bị DROP mất theo bảng; hàm trigger
-- dùng chung vẫn phục vụ Post/Doc/Project.

-- DropForeignKey
ALTER TABLE "AgentRun" DROP CONSTRAINT "AgentRun_agentId_fkey";

-- DropForeignKey
ALTER TABLE "ContentDraft" DROP CONSTRAINT "ContentDraft_authorAgentId_fkey";

-- DropForeignKey
ALTER TABLE "DraftRevision" DROP CONSTRAINT "DraftRevision_draftId_fkey";

-- DropForeignKey
ALTER TABLE "SealApplication" DROP CONSTRAINT "SealApplication_domainId_fkey";

-- DropForeignKey
ALTER TABLE "SealApplication" DROP CONSTRAINT "SealApplication_orgId_fkey";

-- DropForeignKey
ALTER TABLE "SealApplication" DROP CONSTRAINT "SealApplication_programId_fkey";

-- DropForeignKey
ALTER TABLE "SealEvidence" DROP CONSTRAINT "SealEvidence_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "TopicIdea" DROP CONSTRAINT "TopicIdea_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "TrustCertificate" DROP CONSTRAINT "TrustCertificate_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "TrustCertificate" DROP CONSTRAINT "TrustCertificate_domainId_fkey";

-- DropForeignKey
ALTER TABLE "TrustCertificate" DROP CONSTRAINT "TrustCertificate_orgId_fkey";

-- DropForeignKey
ALTER TABLE "TrustCertificate" DROP CONSTRAINT "TrustCertificate_programId_fkey";

-- DropForeignKey
ALTER TABLE "TrustCheck" DROP CONSTRAINT "TrustCheck_certificateId_fkey";

-- DropForeignKey
ALTER TABLE "TrustDomain" DROP CONSTRAINT "TrustDomain_orgId_fkey";

-- DropForeignKey
ALTER TABLE "TrustInviteRedemption" DROP CONSTRAINT "TrustInviteRedemption_inviteId_fkey";

-- DropForeignKey
ALTER TABLE "TrustInviteRedemption" DROP CONSTRAINT "TrustInviteRedemption_userId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "trustProgramSlug";

-- DropTable
DROP TABLE "AgentProfile";

-- DropTable
DROP TABLE "AgentRun";

-- DropTable
DROP TABLE "ContentDraft";

-- DropTable
DROP TABLE "DraftRevision";

-- DropTable
DROP TABLE "NewsroomChannel";

-- DropTable
DROP TABLE "NewsroomEvent";

-- DropTable
DROP TABLE "NewsroomSource";

-- DropTable
DROP TABLE "SealApplication";

-- DropTable
DROP TABLE "SealEvidence";

-- DropTable
DROP TABLE "SealProgram";

-- DropTable
DROP TABLE "TopicIdea";

-- DropTable
DROP TABLE "TrustCertificate";

-- DropTable
DROP TABLE "TrustCheck";

-- DropTable
DROP TABLE "TrustDomain";

-- DropTable
DROP TABLE "TrustInvite";

-- DropTable
DROP TABLE "TrustInviteRedemption";

-- DropTable
DROP TABLE "TrustOrganization";

-- DropEnum
DROP TYPE "AgentDept";

-- DropEnum
DROP TYPE "AgentStatus";

-- DropEnum
DROP TYPE "AssessmentBasis";

-- DropEnum
DROP TYPE "Autonomy";

-- DropEnum
DROP TYPE "CertificateStatus";

-- DropEnum
DROP TYPE "DomainVerifyMethod";

-- DropEnum
DROP TYPE "DomainVerifyStatus";

-- DropEnum
DROP TYPE "DraftStatus";

-- DropEnum
DROP TYPE "DraftTarget";

-- DropEnum
DROP TYPE "NewsroomEventStatus";

-- DropEnum
DROP TYPE "SealApplicationStatus";

-- DropEnum
DROP TYPE "TrustOrgStatus";

