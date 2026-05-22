-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "monthlyPrice" INTEGER NOT NULL DEFAULT 0,
    "yearlyPrice" INTEGER NOT NULL DEFAULT 0,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "memberLimit" INTEGER NOT NULL DEFAULT 1,
    "clientSpaceLimit" INTEGER NOT NULL DEFAULT 1,
    "brandPackLimit" INTEGER NOT NULL DEFAULT 1,
    "seriesPackLimit" INTEGER NOT NULL DEFAULT 3,
    "projectLimit" INTEGER NOT NULL DEFAULT 5,
    "exportLimit" INTEGER NOT NULL DEFAULT 10,
    "batchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "multiPlatformEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "yearlyDiscount" REAL NOT NULL DEFAULT 0.0,
    "creditCarryOverRatio" REAL NOT NULL DEFAULT 0.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'subscription',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "planId" TEXT,
    "fuelPackId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paymentMethod" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FuelPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChannelPartner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "discountRate" REAL NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "contactInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'standard',
    "planId" TEXT,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "fuelCredits" INTEGER NOT NULL DEFAULT 0,
    "channelPartnerId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "quotaResetAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workspace_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Workspace_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "ChannelPartner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Workspace" ("createdAt", "id", "name", "ownerUserId", "type", "updatedAt") SELECT "createdAt", "id", "name", "ownerUserId", "type", "updatedAt" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
