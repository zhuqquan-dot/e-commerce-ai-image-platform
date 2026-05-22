export interface ExportNamingRule {
  platform: string
  namingTemplate: string
  slotTypeFileNameMap: Record<string, string>
  directoryStructure: {
    rootDir: string
    imagesDir: string
    includeReadme: boolean
    includeManifest: boolean
  }
  sortOrder: string[]
  deliveryNotes: {
    whiteBgRequired: boolean
    textAllowed: boolean
    watermarkAllowed: boolean
    borderAllowed: boolean
    notes: string
  }
}

const AMAZON: ExportNamingRule = {
  platform: 'AMAZON',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: 'MAIN',
    feature: 'PT1',
    scene: 'PT2',
    spec: 'PT3',
    compare: 'PT4',
    trust: 'PT5',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'feature', 'scene', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: true,
    textAllowed: false,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '必须纯白背景 RGB(255,255,255)，主图禁止任何叠加元素',
  },
}

const TAOBAO_TMALL: ExportNamingRule = {
  platform: 'TAOBAO_TMALL',
  namingTemplate: '主图_{position}_{productName}.{ext}',
  slotTypeFileNameMap: {
    main_white: '白底',
    main_text: '带文案',
    feature: '辅图2',
    scene: '辅图3',
    spec: '辅图4',
    compare: '辅图5',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'main_text', 'feature', 'scene', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: true,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '建议白底但不是强制要求',
  },
}

const DOUYIN: ExportNamingRule = {
  platform: 'DOUYIN',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: '主图白底',
    main_text: '主图文案',
    feature: '辅图2',
    scene: '辅图3',
    compare: '辅图4',
    trust: '辅图5',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'main_text', 'feature', 'scene', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: true,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '主图允许≤8字文案',
  },
}

const JD: ExportNamingRule = {
  platform: 'JD',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: '主图',
    main_text: '主图文案',
    feature: '辅图2',
    scene: '辅图3',
    spec: '辅图4',
    compare: '辅图5',
    trust: '辅图6',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'main_text', 'feature', 'scene', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: true,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '',
  },
}

const PINDUODUO: ExportNamingRule = {
  platform: 'PINDUODUO',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_text: '主图',
    feature: '辅图2',
    scene: '辅图3',
    compare: '辅图4',
    trust: '辅图5',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_text', 'feature', 'scene', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: true,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '主图必带文案，740×352尺寸',
  },
}

const SHOPIFY: ExportNamingRule = {
  platform: 'SHOPIFY',
  namingTemplate: '{productName}_{slotType}.{ext}',
  slotTypeFileNameMap: {
    main_white: 'main',
    scene: 'lifestyle',
    feature: 'feature',
    spec: 'spec',
    compare: 'compare',
    trust: 'trust',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'scene', 'feature', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: true,
    watermarkAllowed: true,
    borderAllowed: true,
    notes: '独立站最灵活，支持WebP/GIF',
  },
}

const EBAY: ExportNamingRule = {
  platform: 'EBAY',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: 'main',
    scene: 'lifestyle',
    feature: 'feature',
    spec: 'spec',
    compare: 'compare',
    trust: 'trust',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'feature', 'scene', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: false,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '最多12张图',
  },
}

const ETSY: ExportNamingRule = {
  platform: 'ETSY',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: 'main',
    scene: 'lifestyle',
    feature: 'feature',
    spec: 'process',
    compare: 'compare',
    trust: 'trust',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'scene', 'feature', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: false,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '鼓励场景图和生活感',
  },
}

const TIKTOK_SHOP: ExportNamingRule = {
  platform: 'TIKTOK_SHOP',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: 'main',
    scene: 'lifestyle',
    feature: 'feature',
    spec: 'spec',
    compare: 'compare',
    trust: 'trust',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'scene', 'feature', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: true,
    textAllowed: false,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '600×600白底主图',
  },
}

const ALIEXPRESS: ExportNamingRule = {
  platform: 'ALIEXPRESS',
  namingTemplate: '{productName}_{slotType}.jpg',
  slotTypeFileNameMap: {
    main_white: 'main',
    feature: 'feature',
    scene: 'scene',
    spec: 'spec',
    compare: 'compare',
    trust: 'trust',
  },
  directoryStructure: {
    rootDir: 'export',
    imagesDir: 'images',
    includeReadme: true,
    includeManifest: true,
  },
  sortOrder: ['main_white', 'feature', 'scene', 'spec', 'compare', 'trust'],
  deliveryNotes: {
    whiteBgRequired: false,
    textAllowed: false,
    watermarkAllowed: false,
    borderAllowed: false,
    notes: '最多6张图',
  },
}

export class ExportRuleRegistry {
  static readonly RULES: ExportNamingRule[] = [
    AMAZON,
    TAOBAO_TMALL,
    DOUYIN,
    JD,
    PINDUODUO,
    SHOPIFY,
    EBAY,
    ETSY,
    TIKTOK_SHOP,
    ALIEXPRESS,
  ]

  getRule(platform: string): ExportNamingRule | undefined {
    return ExportRuleRegistry.RULES.find(r => r.platform === platform)
  }

  getAllRules(): ExportNamingRule[] {
    return [...ExportRuleRegistry.RULES]
  }

  formatFileName(platform: string, productName: string, slotType: string, ext: string): string {
    const rule = this.getRule(platform)
    if (!rule) {
      const safeName = this.sanitizeName(productName)
      return `${safeName}_${slotType}.${ext}`
    }

    const safeName = this.sanitizeName(productName)
    const slotSegment = rule.slotTypeFileNameMap[slotType] || slotType

    let result = rule.namingTemplate
    result = result.replace(/\{productName\}/g, safeName)
    result = result.replace(/\{slotType\}/g, slotSegment)
    result = result.replace(/\{position\}/g, slotSegment)
    result = result.replace(/\{ext\}/g, ext)

    return result
  }

  getSlotFileName(platform: string, slotType: string): string {
    const rule = this.getRule(platform)
    if (!rule) return slotType
    return rule.slotTypeFileNameMap[slotType] || slotType
  }

  getSortOrder(platform: string): string[] {
    const rule = this.getRule(platform)
    if (!rule) return []
    return [...rule.sortOrder]
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^\w\u4e00-\u9fff]/g, '_').substring(0, 30)
  }
}

export const exportRuleRegistry = new ExportRuleRegistry()
