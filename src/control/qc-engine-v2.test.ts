import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  product: { findUnique: vi.fn() },
  project: { findUnique: vi.fn() },
  seriesPack: { findUnique: vi.fn() },
  generationTask: { findUnique: vi.fn() },
  platformRulePack: { findUnique: vi.fn() },
  candidateAsset: { findUnique: vi.fn() },
  qcResult: { create: vi.fn() },
};

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { QCGrade } from '@/types/enums';

const { QCEngine } = await vi.importActual<typeof import('./qc-engine')>(
  './qc-engine',
);

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    clientSpaceId: 'cs-1',
    brandPackId: '',
    seriesPackId: '',
    productName: '测试商品',
    category: '',
    sku: '',
    spu: '',
    primaryLanguage: 'zh-CN',
    marketRegion: 'CN',
    rtlRequired: false,
    material: '',
    color: '',
    size: '',
    weight: '',
    capacity: '',
    model: '',
    compatibleModel: '',
    packageContents: '',
    coreSellingPoint1: '',
    coreSellingPoint2: '',
    coreSellingPoint3: '',
    differentiation: '',
    targetAudience: '',
    useCase: '',
    painPoint: '',
    publicProofAssets: '',
    forbiddenClaims: '',
    restrictedCopy: '',
    frontRefImage: '',
    angle45RefImage: '',
    sideRefImage: '',
    backRefImage: '',
    topRefImage: '',
    detailRefImages: '[]',
    packagingRefImage: '',
    accessoryRefImage: '',
    logoRefImage: '',
    mainColor: '',
    secondaryColor: '',
    shapeType: '',
    edgeFeature: '',
    surfaceMaterial: '',
    textureFeature: '',
    logoPosition: '',
    labelPosition: '',
    buttonPortPosition: '',
    structurePartition: '',
    accessoryCount: '',
    mustNotChangeFeatures: '[]',
    mustNotDisappearFeatures: '[]',
    mustNotAddFeatures: '[]',
    allowMinorVariationFields: '[]',
    inputMode: 'quick',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    productId: 'prod-1',
    projectName: '测试项目',
    clientSpaceId: 'cs-1',
    parentProjectId: null,
    projectType: 'single_product_single_platform',
    status: 'draft',
    selectedPlatforms: '[]',
    seriesPackId: null,
    inputMode: 'quick',
    bundleType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSeriesPack(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp-1',
    clientSpaceId: 'cs-1',
    brandPackId: 'bp-1',
    seriesName: '测试系列',
    styleLockText: null,
    fixedPalette: '[]',
    backgroundSystem: null,
    lightingSystem: null,
    defaultBundleStructure: null,
    defaultReviewThreshold: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    brandPack: {
      id: 'bp-1',
      clientSpaceId: 'cs-1',
      brandName: '测试品牌',
      brandPrimaryColor: '#FF0000',
      brandSecondaryColor: '#00FF00',
      brandFontPreference: 'sans-serif',
      brandTone: '简约专业',
      brandForbiddenWords: '[]',
      brandVisualBoundary: '四边各留10%安全区',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    attemptId: 'attempt-1',
    taskId: 'task-1',
    localPath: '/storage/a.png',
    remoteUrl: null,
    width: 800,
    height: 800,
    format: 'png',
    fileSizeBytes: 1024 * 1024,
    imageUrl: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    platformName: 'AMAZON',
    platformRegion: 'US',
    platformType: null,
    defaultLanguage: null,
    status: 'active',
    maxImages: 7,
    mainImageRatio: '1:1',
    mainImageSize: '2000x2000',
    allowedFormats: '["JPEG","PNG"]',
    maxFileSizeMb: 5,
    whiteBackgroundRequired: true,
    textAllowedOnMainImage: false,
    watermarkAllowed: false,
    borderAllowed: false,
    logoAllowed: false,
    maxOverlayTextLength: null,
    supportedLanguagesForPromptText: '[]',
    supportedSlots: '[]',
    forbiddenWords: '[]',
    absoluteTermsForbidden: true,
    medicalTermsForbidden: false,
    exportFileNamingRule: null,
    whiteBackgroundToleranceR: 250,
    whiteBackgroundToleranceG: 250,
    whiteBackgroundToleranceB: 250,
    textConstraints: '{}',
    forbiddenElements: '[]',
    priceOverlayZone: '{}',
    exportDirectoryStructure: '{}',
    exportSortOrder: '[]',
    deliveryNotes: '{}',
    versions: '[]',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    projectId: 'proj-1',
    productId: 'prod-1',
    platformPackId: 'rule-1',
    slotCode: 'main_white',
    bundleSlotId: 'slot-1',
    status: 'generated',
    creditCost: 1,
    retryCount: 0,
    manualRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('QCEngine v2', () => {
  let engine: InstanceType<typeof QCEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new QCEngine();
  });

  describe('checkConsistency', () => {
    it('全字段一致性：所有6个真值字段均填充，score>=83', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({
          mainColor: '#3366CC',
          shapeType: '圆柱形',
          surfaceMaterial: '磨砂玻璃',
          textureFeature: '细腻颗粒感',
          edgeFeature: '圆角R3',
          accessoryCount: '3',
        }),
      );

      const result = await (engine as unknown as {
        checkConsistency: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkConsistency('prod-1', 'task-1');

      expect(result.score).toBeGreaterThanOrEqual(100);
      expect(result.reasons.some((r) => r.includes('mainColor'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('shapeType'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('surfaceMaterial'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('textureFeature'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('edgeFeature'))).toBe(true);
      expect(result.reasons.some((r) => r.includes('accessoryCount'))).toBe(
        true,
      );
      expect(
        result.reasons.some((r) => r.includes('[一致性检测]')),
      ).toBe(true);
    });

    it('部分字段缺失：仅3个有值，其余skip，score≈50', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({
          mainColor: '#FF0000',
          shapeType: '',
          surfaceMaterial: '金属',
          textureFeature: '',
          edgeFeature: '',
          accessoryCount: '2',
        }),
      );

      const result = await (engine as unknown as {
        checkConsistency: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkConsistency('prod-1', 'task-1');

      expect(result.score).toBe(50);
      expect(
        result.reasons.filter((r) => r.includes('[skip]')).length,
      ).toBeGreaterThanOrEqual(3);
    });

    it('mustNot* 约束：3条约束带来bonus加分', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({
          mainColor: '#FF0000',
          shapeType: '方形',
          surfaceMaterial: '塑料',
          textureFeature: '光滑',
          edgeFeature: '直角',
          accessoryCount: '0',
          mustNotChangeFeatures: JSON.stringify(['mainColor']),
          mustNotDisappearFeatures: JSON.stringify(['logoPosition']),
          mustNotAddFeatures: JSON.stringify(['watermark']),
        }),
      );

      const result = await (engine as unknown as {
        checkConsistency: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkConsistency('prod-1', 'task-1');

      expect(result.score).toBe(100); // baseScore 100 + bonus 15 → capped at 100
      expect(
        result.reasons.some((r) =>
          r.includes('mustNotChangeFeatures.mainColor'),
        ),
      ).toBe(true);
      expect(
        result.reasons.some((r) =>
          r.includes('mustNotDisappearFeatures.logoPosition'),
        ),
      ).toBe(true);
      expect(
        result.reasons.some((r) =>
          r.includes('mustNotAddFeatures.watermark'),
        ),
      ).toBe(true);
    });

    it('商品不存在返回score=0', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await (engine as unknown as {
        checkConsistency: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkConsistency('nonexistent', 'task-1');

      expect(result.score).toBe(0);
      expect(result.reasons[0]).toContain('商品不存在');
    });
  });

  describe('checkStyle', () => {
    it('有 SeriesPack + 全配置：4个类别全部配置，score=100', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ seriesPackId: 'sp-1' }),
      );
      mockPrisma.seriesPack.findUnique.mockResolvedValue(
        makeSeriesPack({
          fixedPalette: JSON.stringify(['#FF0000', '#00FF00', '#0000FF']),
          backgroundSystem: '纯白渐变底 255,255,255→240,240,240',
          lightingSystem: '左前45°主光 5500K + 右侧补光',
        }),
      );

      const result = await (engine as unknown as {
        checkStyle: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkStyle('proj-1', 'task-1');

      expect(result.score).toBe(100);
      expect(result.reasons.some((r) => r.includes('色板约束已配置'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('背景约束已配置'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('光照约束已配置'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('品牌语气边界已配置'))).toBe(
        true,
      );
    });

    it('无 SeriesPack：返回 score=60 默认保守标准', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ seriesPackId: null }),
      );

      const result = await (engine as unknown as {
        checkStyle: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkStyle('proj-1', 'task-1');

      expect(result.score).toBe(60);
      expect(result.reasons[0]).toBe('样式锁未配置：基于默认保守标准评估');
    });

    it('有 SeriesPack 但无 BrandPack 关联：品牌类别skip', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ seriesPackId: 'sp-1' }),
      );
      mockPrisma.seriesPack.findUnique.mockResolvedValue(
        makeSeriesPack({
          fixedPalette: JSON.stringify(['#FF0000']),
          backgroundSystem: null,
          lightingSystem: null,
          brandPack: null as unknown,
        }),
      );

      const result = await (engine as unknown as {
        checkStyle: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkStyle('proj-1', 'task-1');

      expect(result.score).toBe(25);
      expect(result.reasons.some((r) => r.includes('色板约束已配置'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('背景约束未配置'))).toBe(
        true,
      );
      expect(result.reasons.some((r) => r.includes('品牌包未关联'))).toBe(true);
    });

    it('有 BrandPack 但品牌约束不足2项：品牌类别skip', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ seriesPackId: 'sp-1' }),
      );
      mockPrisma.seriesPack.findUnique.mockResolvedValue(
        makeSeriesPack({
          fixedPalette: JSON.stringify(['#FF0000']),
          backgroundSystem: '白色背景',
          lightingSystem: '顶光',
          brandPack: {
            id: 'bp-1',
            clientSpaceId: 'cs-1',
            brandName: '测试品牌',
            brandPrimaryColor: '#FF0000',
            brandSecondaryColor: null,
            brandFontPreference: null,
            brandTone: null,
            brandForbiddenWords: '[]',
            brandVisualBoundary: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      );

      const result = await (engine as unknown as {
        checkStyle: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkStyle('proj-1', 'task-1');

      expect(result.score).toBe(75);
      expect(
        result.reasons.some((r) => r.includes('品牌约束不足')),
      ).toBe(true);
    });

    it('项目不存在：返回score=60', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await (engine as unknown as {
        checkStyle: (p: string, t: string) => Promise<{
          score: number;
          reasons: string[];
        }>;
      }).checkStyle('nonexistent', 'task-1');

      expect(result.score).toBe(60);
      expect(result.reasons[0]).toContain('项目不存在');
    });
  });

  describe('checkCompliance', () => {
    it('硬规则全过 + 软规则null → score≈60', () => {
      const asset = makeAsset({ width: 2000, height: 2000, format: 'PNG', fileSizeBytes: 2 * 1024 * 1024 });
      const rule = makeRule({ allowedFormats: '["PNG","JPEG"]', maxFileSizeMb: 5 });

      const result = (engine as unknown as {
        checkCompliance: (
          a: Record<string, unknown>,
          r: Record<string, unknown>,
          s: string,
        ) => { score: number; reasons: string[] };
      }).checkCompliance(asset, rule, 'main_white');

      expect(result.score).toBe(60);
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('硬规则有fail → 扣分', () => {
      const asset = makeAsset({ width: 100, height: 100, format: 'GIF', fileSizeBytes: 10 * 1024 * 1024 });
      const rule = makeRule({ allowedFormats: '["PNG","JPEG"]', maxFileSizeMb: 5 });

      const result = (engine as unknown as {
        checkCompliance: (
          a: Record<string, unknown>,
          r: Record<string, unknown>,
          s: string,
        ) => { score: number; reasons: string[] };
      }).checkCompliance(asset, rule, 'main_white');

      expect(result.score).toBe(0);
      expect(result.reasons.length).toBeGreaterThanOrEqual(5);
    });

    it('尺寸信息缺失 passed=null 不计入硬规则', () => {
      const asset = makeAsset({ width: 0, height: 0, format: 'PNG', fileSizeBytes: 2 * 1024 * 1024 });
      const rule = makeRule();

      const result = (engine as unknown as {
        checkCompliance: (
          a: Record<string, unknown>,
          r: Record<string, unknown>,
          s: string,
        ) => { score: number; reasons: string[] };
      }).checkCompliance(asset, rule, 'main_white');

      expect(result.score).toBe(60);
    });
  });

  describe('check 集成流程', () => {
    it('全链路集成：consistency+style+compliance 三相结果均被计算', async () => {
      mockPrisma.generationTask.findUnique.mockResolvedValue(makeTask());
      mockPrisma.platformRulePack.findUnique.mockResolvedValue(makeRule());
      mockPrisma.candidateAsset.findUnique.mockResolvedValue(makeAsset());
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({
          mainColor: '#3366CC',
          shapeType: '圆柱形',
          surfaceMaterial: '磨砂玻璃',
          textureFeature: '细腻颗粒感',
          edgeFeature: '圆角R3',
          accessoryCount: '3',
        }),
      );
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ seriesPackId: 'sp-1' }),
      );
      mockPrisma.seriesPack.findUnique.mockResolvedValue(
        makeSeriesPack({
          fixedPalette: JSON.stringify(['#FF0000', '#00FF00']),
          backgroundSystem: '纯白',
          lightingSystem: '顶光',
        }),
      );
      mockPrisma.qcResult.create.mockResolvedValue({});

      const result = await engine.check({
        taskId: 'task-1',
        assetId: 'asset-1',
      });

      expect(result.consistencyScore).toBeGreaterThanOrEqual(100);
      expect(result.styleScore).toBe(100);
      expect(result.complianceScore).toBeDefined();
      expect(result.overallGrade).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.riskTags).toBeDefined();
      expect(result.suggestedAction).toBeDefined();
    });
  });

  describe('determineGrade', () => {
    const getGrade = (
      consistency: number,
      style: number,
      compliance: number,
    ) =>
      (engine as unknown as {
        determineGrade: (c: number, s: number, co: number) => QCGrade;
      }).determineGrade(consistency, style, compliance);

    it('S级：consistency>=90 && style>=90 && compliance>=95', () => {
      expect(getGrade(90, 90, 95)).toBe(QCGrade.S);
    });

    it('A级：avg>=80 但不满足S条件', () => {
      expect(getGrade(80, 80, 80)).toBe(QCGrade.A);
    });

    it('B级：avg>=60 但不满足A条件', () => {
      expect(getGrade(60, 60, 60)).toBe(QCGrade.B);
    });

    it('C级：avg<60 → C', () => {
      expect(getGrade(50, 50, 50)).toBe(QCGrade.C);
    });

    it('C级：complianceScore<30 直接C', () => {
      expect(getGrade(90, 90, 29)).toBe(QCGrade.C);
    });

    it('S不触发：consistency=89, style=91, compliance=96 (consistency<90)', () => {
      expect(getGrade(89, 91, 96)).not.toBe(QCGrade.S);
      expect(getGrade(89, 91, 96)).toBe(QCGrade.A);
    });
  });

  describe('getSuggestedAction', () => {
    const getAction = (grade: QCGrade) =>
      (engine as unknown as {
        getSuggestedAction: (g: QCGrade) => string;
      }).getSuggestedAction(grade);

    it('S → fast_track', () => {
      expect(getAction(QCGrade.S)).toBe('fast_track');
    });

    it('A → review', () => {
      expect(getAction(QCGrade.A)).toBe('review');
    });

    it('B → regenerate', () => {
      expect(getAction(QCGrade.B)).toBe('regenerate');
    });

    it('C → block', () => {
      expect(getAction(QCGrade.C)).toBe('block');
    });
  });
});
