import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConsistencyDetectionProvider } from './consistency-detection-provider'
import { RuleBasedDetectionProvider, ruleBasedDetectionProvider } from './rule-based-detection-provider'
import { ProviderRegistry } from './provider-registry'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    product: {
      findUnique: vi.fn(),
    },
    seriesPack: {
      findUnique: vi.fn(),
    },
    brandPack: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    productName: '测试商品',
    sku: 'SKU001',
    category: '电子产品',
    material: '金属',
    color: '黑色',
    size: 'M',
    weight: '500g',
    capacity: '1L',
    model: 'X1',
    compatibleModel: 'X2',
    packageContents: '主机、说明书',
    mainColor: '#000000',
    secondaryColor: '#FFFFFF',
    shapeType: '矩形',
    edgeFeature: '圆角',
    surfaceMaterial: '磨砂',
    textureFeature: '光滑',
    logoPosition: '正面中央',
    labelPosition: '底部',
    buttonPortPosition: '右侧',
    structurePartition: '一体式',
    accessoryCount: '3',
    mustNotChangeFeatures: '["logo","shape"]',
    mustNotDisappearFeatures: '["button"]',
    mustNotAddFeatures: '["sticker"]',
    allowMinorVariationFields: '["color"]',
    differentiation: '独特卖点',
    ...overrides,
  }
}

function makeSeriesPack(overrides: Record<string, unknown> = {}) {
  return {
    seriesName: '测试系列',
    styleLockText: '极简风格',
    fixedPalette: '["#000","#fff"]',
    backgroundSystem: '白底',
    lightingSystem: '柔光',
    defaultBundleStructure: '标准',
    defaultReviewThreshold: '80',
    brandPack: {
      brandPrimaryColor: '#000',
      brandSecondaryColor: '#fff',
      brandFontPreference: '思源黑体',
      brandTone: '专业',
      brandVisualBoundary: '16:9',
    },
    ...overrides,
  }
}

function makeBrandPack(overrides: Record<string, unknown> = {}) {
  return {
    brandPrimaryColor: '#000',
    brandSecondaryColor: '#fff',
    brandFontPreference: '思源黑体',
    brandTone: '专业',
    brandVisualBoundary: '16:9',
    ...overrides,
  }
}

describe('RuleBasedDetectionProvider', () => {
  let provider: RuleBasedDetectionProvider

  beforeEach(() => {
    provider = new RuleBasedDetectionProvider()
    vi.clearAllMocks()
  })

  describe('接口合规', () => {
    it('实现 ConsistencyDetectionProvider 接口', () => {
      expect(provider).toHaveProperty('providerName')
      expect(provider).toHaveProperty('providerVersion')
      expect(provider).toHaveProperty('detectProductConsistency')
      expect(provider).toHaveProperty('detectStyleConsistency')
    })

    it('providerName 为 rule-based', () => {
      expect(provider.providerName).toBe('rule-based')
    })

    it('providerVersion 为 1.0.0', () => {
      expect(provider.providerVersion).toBe('1.0.0')
    })
  })

  describe('detectProductConsistency', () => {
    it('商品不存在时返回 score=0', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)

      const result = await provider.detectProductConsistency({
        productId: 'p1',
        imageUrl: 'http://example.com/img.jpg',
        taskId: 't1',
      })

      expect(result.score).toBe(0)
      expect(result.reasons).toEqual(['商品不存在'])
      expect(result.detectionMethod).toBe('rule-based-field-presence')
      expect(result.provider).toBe('rule-based')
      expect(result.providerVersion).toBe('1.0.0')
    })

    it('全部字段填写时返回高分', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(makeProduct())

      const result = await provider.detectProductConsistency({
        productId: 'p1',
        imageUrl: 'http://example.com/img.jpg',
        taskId: 't1',
      })

      expect(result.score).toBe(100)
      expect(result.reasons).toHaveLength(27)
      expect(result.reasons[0]).toBe('productName: 测试商品')
      expect(result.detectionMethod).toBe('rule-based-field-presence')
      expect(result.provider).toBe('rule-based')
      expect(result.providerVersion).toBe('1.0.0')
    })

    it('部分字段缺失时返回中等分数', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({
          productName: '测试商品',
          sku: '',
          category: '',
          material: null,
        }),
      )

      const result = await provider.detectProductConsistency({
        productId: 'p1',
        imageUrl: '',
        taskId: 't1',
      })

      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(100)
      expect(result.reasons.some((r) => r.includes('未填写'))).toBe(true)
    })

    it('全部字段为空时返回 score=0', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(
        makeProduct({
          productName: '',
          sku: '',
          category: '',
          material: null,
          color: '',
          size: '',
          weight: '',
          capacity: '',
          model: '',
          compatibleModel: '',
          packageContents: '',
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
          differentiation: '',
        }),
      )

      const result = await provider.detectProductConsistency({
        productId: 'p1',
        imageUrl: '',
        taskId: 't1',
      })

      expect(result.score).toBe(0)
    })

    it('返回结构包含所有必要的 DetectionResult 字段', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(makeProduct())

      const result = await provider.detectProductConsistency({
        productId: 'p1',
        imageUrl: '',
        taskId: 't1',
      })

      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('reasons')
      expect(result).toHaveProperty('detectionMethod')
      expect(result).toHaveProperty('provider')
      expect(result).toHaveProperty('providerVersion')
      expect(Array.isArray(result.reasons)).toBe(true)
      expect(typeof result.score).toBe('number')
    })
  })

  describe('detectStyleConsistency', () => {
    it('无 seriesPackId 和 brandPackId 时返回默认评分', async () => {
      const result = await provider.detectStyleConsistency({
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBe(70)
      expect(result.reasons).toContain('未关联系列包或品牌包，无法检测风格一致性')
      expect(result.detectionMethod).toBe('rule-based-style-constraint')
      expect(result.provider).toBe('rule-based')
      expect(result.providerVersion).toBe('1.0.0')
    })

    it('系列包不存在时返回 score=0', async () => {
      mockPrisma.seriesPack.findUnique.mockResolvedValue(null)

      const result = await provider.detectStyleConsistency({
        seriesPackId: 'sp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBe(0)
      expect(result.reasons).toEqual(['系列包不存在'])
    })

    it('品牌包不存在时返回 score=0', async () => {
      mockPrisma.brandPack.findUnique.mockResolvedValue(null)

      const result = await provider.detectStyleConsistency({
        brandPackId: 'bp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBe(0)
      expect(result.reasons).toEqual(['品牌包不存在'])
    })

    it('系列包全部字段填写后返回高分', async () => {
      mockPrisma.seriesPack.findUnique.mockResolvedValue(makeSeriesPack())

      const result = await provider.detectStyleConsistency({
        seriesPackId: 'sp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBe(100)
      expect(result.reasons).toHaveLength(12)
      expect(result.reasons[0]).toBe('seriesName: 测试系列')
      expect(result.detectionMethod).toBe('rule-based-style-constraint')
    })

    it('系列包部分字段未配置时返回中等分数', async () => {
      mockPrisma.seriesPack.findUnique.mockResolvedValue(
        makeSeriesPack({
          seriesName: '测试系列',
          styleLockText: null,
          fixedPalette: '[]',
          backgroundSystem: '',
        }),
      )

      const result = await provider.detectStyleConsistency({
        seriesPackId: 'sp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(100)
      expect(result.reasons.some((r) => r.includes('未配置'))).toBe(true)
    })

    it('品牌包单独传入时检测品牌字段', async () => {
      mockPrisma.brandPack.findUnique.mockResolvedValue(makeBrandPack())

      const result = await provider.detectStyleConsistency({
        brandPackId: 'bp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBe(100)
      expect(result.reasons).toHaveLength(5)
      expect(result.reasons[0]).toBe('brandPrimaryColor: #000')
    })

    it('品牌包部分字段未配置时返回中等分数', async () => {
      mockPrisma.brandPack.findUnique.mockResolvedValue(
        makeBrandPack({
          brandPrimaryColor: '',
          brandSecondaryColor: null,
        }),
      )

      const result = await provider.detectStyleConsistency({
        brandPackId: 'bp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(100)
      expect(result.reasons.some((r) => r.includes('未配置'))).toBe(true)
    })

    it('返回结构包含所有必要的 DetectionResult 字段', async () => {
      mockPrisma.seriesPack.findUnique.mockResolvedValue(makeSeriesPack())

      const result = await provider.detectStyleConsistency({
        seriesPackId: 'sp1',
        projectId: 'prj1',
        imagePlaceholders: [],
      })

      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('reasons')
      expect(result).toHaveProperty('detectionMethod')
      expect(result).toHaveProperty('provider')
      expect(result).toHaveProperty('providerVersion')
      expect(Array.isArray(result.reasons)).toBe(true)
      expect(typeof result.score).toBe('number')
    })
  })

  describe('单例导出', () => {
    it('ruleBasedDetectionProvider 是 RuleBasedDetectionProvider 实例', () => {
      expect(ruleBasedDetectionProvider).toBeInstanceOf(RuleBasedDetectionProvider)
    })
  })
})

describe('ProviderRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('单例模式返回同一实例', () => {
    const a = ProviderRegistry.getInstance()
    const b = ProviderRegistry.getInstance()
    expect(a).toBe(b)
  })

  it('默认 productProvider 为 RuleBasedDetectionProvider', () => {
    const registry = ProviderRegistry.getInstance()
    const pp = registry.getProductProvider()
    expect(pp).toBeInstanceOf(RuleBasedDetectionProvider)
    expect(pp.providerName).toBe('rule-based')
  })

  it('默认 styleProvider 为 RuleBasedDetectionProvider', () => {
    const registry = ProviderRegistry.getInstance()
    const sp = registry.getStyleProvider()
    expect(sp).toBeInstanceOf(RuleBasedDetectionProvider)
    expect(sp.providerName).toBe('rule-based')
  })

  it('setProductProvider 替换 product provider', () => {
    const registry = ProviderRegistry.getInstance()
    const mock: ConsistencyDetectionProvider = {
      providerName: 'mock-ai',
      providerVersion: '2.0.0',
      detectProductConsistency: vi.fn(),
      detectStyleConsistency: vi.fn(),
    }
    registry.setProductProvider(mock)
    expect(registry.getProductProvider().providerName).toBe('mock-ai')
  })

  it('setStyleProvider 替换 style provider', () => {
    const registry = ProviderRegistry.getInstance()
    const mock: ConsistencyDetectionProvider = {
      providerName: 'mock-ai',
      providerVersion: '2.0.0',
      detectProductConsistency: vi.fn(),
      detectStyleConsistency: vi.fn(),
    }
    registry.setStyleProvider(mock)
    expect(registry.getStyleProvider().providerName).toBe('mock-ai')
  })
})
