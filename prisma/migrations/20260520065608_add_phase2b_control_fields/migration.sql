-- AlterTable
ALTER TABLE "ReviewRecord" ADD COLUMN "reviewerId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenerationTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platformPackId" TEXT NOT NULL,
    "slotCode" TEXT NOT NULL,
    "bundleSlotId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "manualRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationTask_bundleSlotId_fkey" FOREIGN KEY ("bundleSlotId") REFERENCES "BundleSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenerationTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenerationTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenerationTask_platformPackId_fkey" FOREIGN KEY ("platformPackId") REFERENCES "PlatformRulePack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GenerationTask" ("bundleSlotId", "createdAt", "creditCost", "id", "platformPackId", "productId", "projectId", "retryCount", "slotCode", "status", "updatedAt") SELECT "bundleSlotId", "createdAt", "creditCost", "id", "platformPackId", "productId", "projectId", "retryCount", "slotCode", "status", "updatedAt" FROM "GenerationTask";
DROP TABLE "GenerationTask";
ALTER TABLE "new_GenerationTask" RENAME TO "GenerationTask";
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "clientSpaceId" TEXT NOT NULL DEFAULT '',
    "parentProjectId" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'single_product_single_platform',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "selectedPlatforms" TEXT NOT NULL DEFAULT '[]',
    "seriesPackId" TEXT,
    "inputMode" TEXT NOT NULL DEFAULT 'quick',
    "bundleType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "id", "inputMode", "parentProjectId", "productId", "projectType", "selectedPlatforms", "status", "updatedAt") SELECT "createdAt", "id", "inputMode", "parentProjectId", "productId", "projectType", "selectedPlatforms", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
