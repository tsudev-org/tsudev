-- INT1-b: nhật ký an ninh lượt gọi API của app (APP_INTEGRITY 4, PRODUCT_POLICY 7.7). Thuần thêm.
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "clientId" TEXT,
    "jktHash" TEXT,
    "ipPrefix" TEXT,
    "product" TEXT,
    "version" TEXT,
    "channel" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");
CREATE INDEX "SecurityAuditLog_type_createdAt_idx" ON "SecurityAuditLog"("type", "createdAt");
