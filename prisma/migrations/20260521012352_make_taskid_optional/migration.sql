-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CreditRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "taskId" TEXT,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CreditRecord" ("amount", "balanceAfter", "createdAt", "id", "reason", "taskId", "workspaceId") SELECT "amount", "balanceAfter", "createdAt", "id", "reason", "taskId", "workspaceId" FROM "CreditRecord";
DROP TABLE "CreditRecord";
ALTER TABLE "new_CreditRecord" RENAME TO "CreditRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
