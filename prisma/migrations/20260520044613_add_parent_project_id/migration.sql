-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClientSpace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "storeGroupName" TEXT,
    "region" TEXT,
    "defaultLanguage" TEXT,
    "targetMarkets" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientSpace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientSpaceId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandPrimaryColor" TEXT,
    "brandSecondaryColor" TEXT,
    "brandFontPreference" TEXT,
    "brandTone" TEXT,
    "brandForbiddenWords" TEXT NOT NULL DEFAULT '[]',
    "brandVisualBoundary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandPack_clientSpaceId_fkey" FOREIGN KEY ("clientSpaceId") REFERENCES "ClientSpace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeriesPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientSpaceId" TEXT NOT NULL,
    "brandPackId" TEXT NOT NULL,
    "seriesName" TEXT NOT NULL,
    "styleLockText" TEXT,
    "fixedPalette" TEXT NOT NULL DEFAULT '[]',
    "backgroundSystem" TEXT,
    "lightingSystem" TEXT,
    "defaultBundleStructure" TEXT,
    "defaultReviewThreshold" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeriesPack_clientSpaceId_fkey" FOREIGN KEY ("clientSpaceId") REFERENCES "ClientSpace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeriesPack_brandPackId_fkey" FOREIGN KEY ("brandPackId") REFERENCES "BrandPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformRulePack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platformName" TEXT NOT NULL,
    "platformRegion" TEXT NOT NULL,
    "platformType" TEXT,
    "defaultLanguage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxImages" INTEGER NOT NULL,
    "mainImageRatio" TEXT NOT NULL,
    "mainImageSize" TEXT NOT NULL,
    "allowedFormats" TEXT NOT NULL DEFAULT '[]',
    "maxFileSizeMb" REAL NOT NULL,
    "whiteBackgroundRequired" BOOLEAN NOT NULL DEFAULT false,
    "textAllowedOnMainImage" BOOLEAN NOT NULL DEFAULT true,
    "watermarkAllowed" BOOLEAN NOT NULL DEFAULT false,
    "borderAllowed" BOOLEAN NOT NULL DEFAULT false,
    "logoAllowed" BOOLEAN NOT NULL DEFAULT false,
    "maxOverlayTextLength" INTEGER,
    "supportedLanguagesForPromptText" TEXT NOT NULL DEFAULT '[]',
    "supportedSlots" TEXT NOT NULL DEFAULT '[]',
    "forbiddenWords" TEXT NOT NULL DEFAULT '[]',
    "absoluteTermsForbidden" BOOLEAN NOT NULL DEFAULT false,
    "medicalTermsForbidden" BOOLEAN NOT NULL DEFAULT false,
    "exportFileNamingRule" TEXT,
    "whiteBackgroundToleranceR" INTEGER NOT NULL DEFAULT 250,
    "whiteBackgroundToleranceG" INTEGER NOT NULL DEFAULT 250,
    "whiteBackgroundToleranceB" INTEGER NOT NULL DEFAULT 250,
    "textConstraints" TEXT NOT NULL DEFAULT '{}',
    "forbiddenElements" TEXT NOT NULL DEFAULT '[]',
    "priceOverlayZone" TEXT NOT NULL DEFAULT '{}',
    "exportDirectoryStructure" TEXT NOT NULL DEFAULT '{}',
    "exportSortOrder" TEXT NOT NULL DEFAULT '[]',
    "deliveryNotes" TEXT NOT NULL DEFAULT '{}',
    "versions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformRuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platformName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'system',
    "changeNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseURL" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientSpaceId" TEXT NOT NULL,
    "brandPackId" TEXT NOT NULL DEFAULT '',
    "seriesPackId" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL DEFAULT '',
    "spu" TEXT NOT NULL DEFAULT '',
    "primaryLanguage" TEXT NOT NULL DEFAULT 'zh-CN',
    "marketRegion" TEXT NOT NULL DEFAULT 'CN',
    "rtlRequired" BOOLEAN NOT NULL DEFAULT false,
    "material" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "weight" TEXT NOT NULL DEFAULT '',
    "capacity" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "compatibleModel" TEXT NOT NULL DEFAULT '',
    "packageContents" TEXT NOT NULL DEFAULT '',
    "coreSellingPoint1" TEXT NOT NULL DEFAULT '',
    "coreSellingPoint2" TEXT NOT NULL DEFAULT '',
    "coreSellingPoint3" TEXT NOT NULL DEFAULT '',
    "differentiation" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "useCase" TEXT NOT NULL DEFAULT '',
    "painPoint" TEXT NOT NULL DEFAULT '',
    "publicProofAssets" TEXT NOT NULL DEFAULT '',
    "forbiddenClaims" TEXT NOT NULL DEFAULT '',
    "restrictedCopy" TEXT NOT NULL DEFAULT '',
    "frontRefImage" TEXT NOT NULL DEFAULT '',
    "angle45RefImage" TEXT NOT NULL DEFAULT '',
    "sideRefImage" TEXT NOT NULL DEFAULT '',
    "backRefImage" TEXT NOT NULL DEFAULT '',
    "topRefImage" TEXT NOT NULL DEFAULT '',
    "detailRefImages" TEXT NOT NULL DEFAULT '[]',
    "packagingRefImage" TEXT NOT NULL DEFAULT '',
    "accessoryRefImage" TEXT NOT NULL DEFAULT '',
    "logoRefImage" TEXT NOT NULL DEFAULT '',
    "mainColor" TEXT NOT NULL DEFAULT '',
    "secondaryColor" TEXT NOT NULL DEFAULT '',
    "shapeType" TEXT NOT NULL DEFAULT '',
    "edgeFeature" TEXT NOT NULL DEFAULT '',
    "surfaceMaterial" TEXT NOT NULL DEFAULT '',
    "textureFeature" TEXT NOT NULL DEFAULT '',
    "logoPosition" TEXT NOT NULL DEFAULT '',
    "labelPosition" TEXT NOT NULL DEFAULT '',
    "buttonPortPosition" TEXT NOT NULL DEFAULT '',
    "structurePartition" TEXT NOT NULL DEFAULT '',
    "accessoryCount" TEXT NOT NULL DEFAULT '',
    "mustNotChangeFeatures" TEXT NOT NULL DEFAULT '[]',
    "mustNotDisappearFeatures" TEXT NOT NULL DEFAULT '[]',
    "mustNotAddFeatures" TEXT NOT NULL DEFAULT '[]',
    "allowMinorVariationFields" TEXT NOT NULL DEFAULT '[]',
    "inputMode" TEXT NOT NULL DEFAULT 'quick',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "parentProjectId" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'single_product_single_platform',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "selectedPlatforms" TEXT NOT NULL DEFAULT '[]',
    "inputMode" TEXT NOT NULL DEFAULT 'quick',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundlePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BundlePlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundlePlanId" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "isAnchor" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sequenceOrder" INTEGER NOT NULL,
    "exportNameSuggestion" TEXT NOT NULL DEFAULT '',
    "ruleRefs" TEXT NOT NULL DEFAULT '[]',
    "warnings" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BundleSlot_bundlePlanId_fkey" FOREIGN KEY ("bundlePlanId") REFERENCES "BundlePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platformPackId" TEXT NOT NULL,
    "slotCode" TEXT NOT NULL,
    "bundleSlotId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationTask_bundleSlotId_fkey" FOREIGN KEY ("bundleSlotId") REFERENCES "BundleSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenerationTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenerationTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenerationTask_platformPackId_fkey" FOREIGN KEY ("platformPackId") REFERENCES "PlatformRulePack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "providerConfigId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "generationSpec" TEXT,
    "promptText" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GenerationTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CandidateAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "taskId" TEXT,
    "localPath" TEXT NOT NULL,
    "remoteUrl" TEXT,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL DEFAULT 'jpg',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateAsset_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "GenerationAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateAsset_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GenerationTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QcResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "consistencyScore" INTEGER NOT NULL DEFAULT 0,
    "styleScore" INTEGER NOT NULL DEFAULT 0,
    "complianceScore" INTEGER NOT NULL DEFAULT 0,
    "overallGrade" TEXT NOT NULL DEFAULT 'N/A',
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "riskTags" TEXT NOT NULL DEFAULT '[]',
    "suggestedAction" TEXT NOT NULL DEFAULT 'review',
    "aiDetectionInputReserved" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QcResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GenerationTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GenerationTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "clientSpaceId" TEXT NOT NULL,
    "exportScope" TEXT NOT NULL,
    "platformPackId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExportPack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exportPackId" TEXT NOT NULL,
    "candidateAssetId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "exportedFileName" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportMapping_exportPackId_fkey" FOREIGN KEY ("exportPackId") REFERENCES "ExportPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExportMapping_candidateAssetId_fkey" FOREIGN KEY ("candidateAssetId") REFERENCES "CandidateAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportManifest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exportPackId" TEXT NOT NULL,
    "manifestContent" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportManifest_exportPackId_fkey" FOREIGN KEY ("exportPackId") REFERENCES "ExportPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRulePack_platformName_key" ON "PlatformRulePack"("platformName");
