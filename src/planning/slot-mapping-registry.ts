export type UnifiedSlotType = 'main_white' | 'main_text' | 'feature' | 'scene' | 'spec' | 'compare' | 'trust';

export interface SlotMappingEntry {
  nativeName: string;
  unifiedSlotType: UnifiedSlotType;
  isAnchor: boolean;
  isRequired: boolean;
  description: string;
}

export interface PlatformSlotMapping {
  platform: string;
  mappings: SlotMappingEntry[];
}

export const PLATFORM_SLOT_MAPPINGS: PlatformSlotMapping[] = [
  {
    platform: 'AMAZON',
    mappings: [
      { nativeName: 'MAIN', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '纯白底主图' },
      { nativeName: 'PT1', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: 'PT2', unifiedSlotType: 'scene', isAnchor: false, isRequired: false, description: '场景图' },
      { nativeName: 'PT3', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: 'PT4', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: 'PT5', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'TAOBAO_TMALL',
    mappings: [
      { nativeName: '主图(白底)', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '白底主图' },
      { nativeName: '主图(带文案)', unifiedSlotType: 'main_text', isAnchor: false, isRequired: false, description: '带文案主图' },
      { nativeName: '辅图2', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: '辅图3', unifiedSlotType: 'scene', isAnchor: false, isRequired: true, description: '场景图' },
      { nativeName: '辅图4', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: '辅图5', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
    ],
  },
  {
    platform: 'DOUYIN',
    mappings: [
      { nativeName: '主图(白底)', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '白底主图' },
      { nativeName: '主图(带文案)', unifiedSlotType: 'main_text', isAnchor: false, isRequired: true, description: '带文案主图' },
      { nativeName: '辅图2', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: '辅图3', unifiedSlotType: 'scene', isAnchor: false, isRequired: true, description: '场景图' },
      { nativeName: '辅图4', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: '辅图5', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'JD',
    mappings: [
      { nativeName: '主图', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '白底主图' },
      { nativeName: '主图(带文案)', unifiedSlotType: 'main_text', isAnchor: false, isRequired: false, description: '带文案主图' },
      { nativeName: '辅图2', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: '辅图3', unifiedSlotType: 'scene', isAnchor: false, isRequired: true, description: '场景图' },
      { nativeName: '辅图4', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: '辅图5', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: '辅图6', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'PINDUODUO',
    mappings: [
      { nativeName: '主图(带文案)', unifiedSlotType: 'main_text', isAnchor: true, isRequired: true, description: '带文案主图' },
      { nativeName: '辅图2', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: '辅图3', unifiedSlotType: 'scene', isAnchor: false, isRequired: false, description: '场景图' },
      { nativeName: '辅图4', unifiedSlotType: 'compare', isAnchor: false, isRequired: true, description: '竞争对比图' },
      { nativeName: '辅图5', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'SHOPIFY',
    mappings: [
      { nativeName: 'MAIN', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '纯白底主图' },
      { nativeName: 'LIFESTYLE', unifiedSlotType: 'scene', isAnchor: false, isRequired: true, description: '场景图' },
      { nativeName: 'FEATURE', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: 'SPEC', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: 'COMPARE', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: 'TRUST', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'EBAY',
    mappings: [
      { nativeName: 'MAIN', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '纯白底主图' },
      { nativeName: 'LIFESTYLE', unifiedSlotType: 'scene', isAnchor: false, isRequired: false, description: '场景图' },
      { nativeName: 'FEATURE', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: 'SPEC', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: 'COMPARE', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: 'TRUST', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'ETSY',
    mappings: [
      { nativeName: 'MAIN', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '纯白底主图' },
      { nativeName: 'LIFESTYLE', unifiedSlotType: 'scene', isAnchor: false, isRequired: true, description: '场景图' },
      { nativeName: 'FEATURE', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: 'PROCESS', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '制作过程图' },
      { nativeName: 'COMPARE', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: 'TRUST', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'TIKTOK_SHOP',
    mappings: [
      { nativeName: 'MAIN', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '纯白底主图' },
      { nativeName: 'LIFESTYLE', unifiedSlotType: 'scene', isAnchor: false, isRequired: true, description: '场景图' },
      { nativeName: 'FEATURE', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: 'SPEC', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: 'COMPARE', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: 'TRUST', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
  {
    platform: 'ALIEXPRESS',
    mappings: [
      { nativeName: 'MAIN', unifiedSlotType: 'main_white', isAnchor: true, isRequired: true, description: '纯白底主图' },
      { nativeName: 'FEATURE', unifiedSlotType: 'feature', isAnchor: false, isRequired: true, description: '功能卖点图' },
      { nativeName: 'SCENE', unifiedSlotType: 'scene', isAnchor: false, isRequired: false, description: '场景图' },
      { nativeName: 'SPEC', unifiedSlotType: 'spec', isAnchor: false, isRequired: false, description: '规格参数图' },
      { nativeName: 'COMPARE', unifiedSlotType: 'compare', isAnchor: false, isRequired: false, description: '对比图' },
      { nativeName: 'TRUST', unifiedSlotType: 'trust', isAnchor: false, isRequired: false, description: '信任背书图' },
    ],
  },
];

export class SlotMappingRegistry {
  static readonly MAPPINGS: Record<string, SlotMappingEntry[]> = PLATFORM_SLOT_MAPPINGS.reduce(
    (acc, item) => {
      acc[item.platform] = item.mappings;
      return acc;
    },
    {} as Record<string, SlotMappingEntry[]>,
  );

  getMapping(platform: string): SlotMappingEntry[] {
    return SlotMappingRegistry.MAPPINGS[platform] ?? [];
  }

  getAllPlatforms(): string[] {
    return PLATFORM_SLOT_MAPPINGS.map((p) => p.platform);
  }

  resolveSlotType(platform: string, nativeName: string): UnifiedSlotType | null {
    const mappings = SlotMappingRegistry.MAPPINGS[platform];
    if (!mappings) return null;
    const entry = mappings.find((m) => m.nativeName === nativeName);
    return entry ? entry.unifiedSlotType : null;
  }

  getAnchorSlot(platform: string): SlotMappingEntry | null {
    const mappings = SlotMappingRegistry.MAPPINGS[platform];
    if (!mappings) return null;
    return mappings.find((m) => m.isAnchor) ?? null;
  }

  getRequiredSlots(platform: string): SlotMappingEntry[] {
    const mappings = SlotMappingRegistry.MAPPINGS[platform];
    if (!mappings) return [];
    return mappings.filter((m) => m.isRequired);
  }
}

export const slotMappingRegistry = new SlotMappingRegistry();
