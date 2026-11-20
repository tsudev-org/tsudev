-- PRO2 2.4 - thư nhắc gia hạn TsuDEV Pro (tsudev-standards PRODUCT_POLICY 7.2).
-- Thuần THÊM: một cột huỷ nhận trên Entitlement + bảng mốc đã gửi (mỗi mốc tối đa 1 thư).

-- AlterTable
ALTER TABLE "Entitlement" ADD COLUMN     "remindersOptOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProReminderSent" (
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "proUntil" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProReminderSent_pkey" PRIMARY KEY ("userId","kind","proUntil")
);

-- AddForeignKey
ALTER TABLE "ProReminderSent" ADD CONSTRAINT "ProReminderSent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

