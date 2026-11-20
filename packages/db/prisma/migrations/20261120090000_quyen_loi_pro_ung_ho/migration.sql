-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('play', 'appstore', 'web');

-- CreateEnum
CREATE TYPE "BadgeDisplay" AS ENUM ('AUTO', 'PRO', 'DONOR', 'BOTH', 'HIDDEN');

-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "rpPublicJwk" JSONB;

-- CreateTable
CREATE TABLE "Entitlement" (
    "userId" TEXT NOT NULL,
    "proUntil" TIMESTAMP(3),
    "proSource" "EntitlementSource",
    "donorSince" TIMESTAMP(3),
    "badgeDisplay" "BadgeDisplay" NOT NULL DEFAULT 'AUTO',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "EntitlementEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "externalId" TEXT,
    "proUntil" TIMESTAMP(3),
    "proSource" "EntitlementSource",
    "donation" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitlementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "clientId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "AppInstallation" (
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "installationIdHash" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'other',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppInstallation_pkey" PRIMARY KEY ("userId","clientId","installationIdHash")
);

-- CreateIndex
CREATE INDEX "EntitlementEvent_userId_createdAt_idx" ON "EntitlementEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntitlementEvent_kind_externalId_key" ON "EntitlementEvent"("kind", "externalId");

-- CreateIndex
CREATE INDEX "PaymentIntent_userId_createdAt_idx" ON "PaymentIntent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_expiresAt_idx" ON "PaymentIntent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AppInstallation_lastSeenAt_idx" ON "AppInstallation"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementEvent" ADD CONSTRAINT "EntitlementEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInstallation" ADD CONSTRAINT "AppInstallation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

