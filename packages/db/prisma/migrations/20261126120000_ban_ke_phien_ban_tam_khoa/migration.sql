-- INT1-a + LG3 (gộp để chủ dự án migrate Neon MỘT lần). Thuần THÊM, không DROP, không khoá bảng lâu.
--   1. User: mốc + lý do tạm khoá (AUTH_AND_ACCOUNT 9.2, `status = suspended`).
--   2. AppVersionChannel: `latest` theo kênh cho bản kê versions.json có chữ ký (APP_INTEGRITY 2.1).

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "AppVersionChannel" (
    "product" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "latest" TEXT NOT NULL,
    "url" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersionChannel_pkey" PRIMARY KEY ("product","channel")
);
