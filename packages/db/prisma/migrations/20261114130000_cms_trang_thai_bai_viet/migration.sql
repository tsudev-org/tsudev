-- P2.1 CMS "Viết bài" (docs/de-xuat-bao-mat-cms-cai-bang-lenh.md): máy trạng thái bài, chuyên mục,
-- lịch sử nội dung, nhật ký chuyển trạng thái, lượt xem theo ngày. Chỉ THÊM + điền ngược, không DROP.
-- `published` GIỮ làm cột suy ra từ `status` (gỡ sau một bản phát hành).

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostRevision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "editorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostStatusEvent" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "from" "PostStatus",
    "to" "PostStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostViewDaily" (
    "postId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostViewDaily_pkey" PRIMARY KEY ("postId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "PostRevision_postId_createdAt_idx" ON "PostRevision"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostStatusEvent_postId_createdAt_idx" ON "PostStatusEvent"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostViewDaily_day_idx" ON "PostViewDaily"("day");

-- CreateIndex
CREATE INDEX "Post_status_updatedAt_idx" ON "Post"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostStatusEvent" ADD CONSTRAINT "PostStatusEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostViewDaily" ADD CONSTRAINT "PostViewDaily_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Điền ngược trạng thái từ dữ liệu cũ. Đúng nghĩa với đường đọc công khai hiện có:
--   published + publishedAt tương lai ⇒ SCHEDULED; published ⇒ PUBLISHED;
--   ẩn và do Toà soạn (đã gỡ 29/10/2026) sinh ⇒ ARCHIVED; ẩn còn lại ⇒ DRAFT.
UPDATE "Post" SET "status" = CASE
  WHEN "published" AND "publishedAt" IS NOT NULL AND "publishedAt" > CURRENT_TIMESTAMP THEN 'SCHEDULED'::"PostStatus"
  WHEN "published" THEN 'PUBLISHED'::"PostStatus"
  WHEN "authoredByAgentId" IS NOT NULL THEN 'ARCHIVED'::"PostStatus"
  ELSE 'DRAFT'::"PostStatus"
END;
