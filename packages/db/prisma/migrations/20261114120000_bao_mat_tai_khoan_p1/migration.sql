-- P1 bảo mật tài khoản (docs/de-xuat-bao-mat-cms-cai-bang-lenh.md): nút "Không phải tôi" (P1.5),
-- cờ mật khẩu lộ cho thẻ Mức an toàn (P1.4/P1.1), bộ đếm tần suất lưu bền (P1.6, D8). Chỉ THÊM, không DROP.

-- AlterEnum
ALTER TYPE "AuthTokenPurpose" ADD VALUE 'SESSION_REVOKE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

