import { describe, it, expect } from 'vitest';
import { SlotMappingRegistry, type SlotMappingEntry } from './slot-mapping-registry';
import { SlotType } from '@/types/enums';

const registry = new SlotMappingRegistry();

const ALL_PLATFORMS = registry.getAllPlatforms();

interface SimulatedSlot {
  slotType: SlotType;
  isAnchor: boolean;
  isRequired: boolean;
  maxCount: number;
  minCount: number;
}

function simulatePlanSlots(mappings: SlotMappingEntry[]): SimulatedSlot[] {
  const slots: SimulatedSlot[] = [];

  for (const mapping of mappings) {
    const slotType = mapping.unifiedSlotType as SlotType;
    const isAnchor = mapping.unifiedSlotType === 'main_white';
    const maxCount = 1;
    const minCount = mapping.isRequired ? 1 : 0;

    slots.push({
      slotType,
      isAnchor,
      isRequired: mapping.isRequired,
      maxCount,
      minCount,
    });
  }

  const mainWhiteFound = slots.some((s) => s.slotType === SlotType.MAIN_WHITE);
  if (!mainWhiteFound) {
    const firstRequired = slots.find((s) => s.isRequired);
    if (firstRequired) {
      firstRequired.isAnchor = true;
    }
  }

  const anchors = slots.filter((s) => s.isAnchor);
  const nonAnchors = slots.filter((s) => !s.isAnchor);

  return [...anchors, ...nonAnchors];
}

function getMainSlotTypes(mappings: SlotMappingEntry[]): string[] {
  return mappings
    .filter((m) => m.unifiedSlotType === 'main_white' || m.unifiedSlotType === 'main_text')
    .map((m) => m.unifiedSlotType);
}

const CHINESE_TIER = ['TAOBAO_TMALL', 'JD', 'DOUYIN'];
const INTERNATIONAL_TIER = ALL_PLATFORMS.filter((p) => !CHINESE_TIER.includes(p));
const WESTERN_PLATFORMS = ['AMAZON', 'EBAY', 'ETSY', 'SHOPIFY', 'TIKTOK_SHOP', 'ALIEXPRESS'];

describe('BundlePlanner v2 — 图包规划器增强', () => {
  it('10 平台名称枚举完整', () => {
    expect(ALL_PLATFORMS).toHaveLength(10);
    expect(ALL_PLATFORMS).toContain('TAOBAO_TMALL');
    expect(ALL_PLATFORMS).toContain('JD');
    expect(ALL_PLATFORMS).toContain('PINDUODUO');
    expect(ALL_PLATFORMS).toContain('DOUYIN');
    expect(ALL_PLATFORMS).toContain('AMAZON');
    expect(ALL_PLATFORMS).toContain('EBAY');
    expect(ALL_PLATFORMS).toContain('ETSY');
    expect(ALL_PLATFORMS).toContain('SHOPIFY');
    expect(ALL_PLATFORMS).toContain('TIKTOK_SHOP');
    expect(ALL_PLATFORMS).toContain('ALIEXPRESS');
  });

  it('淘宝应输出 main_white + main_text 两个主图 slot', () => {
    const mappings = registry.getMapping('TAOBAO_TMALL');
    const mainTypes = getMainSlotTypes(mappings);
    expect(mainTypes).toContain('main_white');
    expect(mainTypes).toContain('main_text');
    expect(mainTypes).toHaveLength(2);
  });

  it('Amazon 应只有 main_white 一个主图 slot', () => {
    const mappings = registry.getMapping('AMAZON');
    const mainTypes = getMainSlotTypes(mappings);
    expect(mainTypes).toContain('main_white');
    expect(mainTypes).not.toContain('main_text');
    expect(mainTypes).toHaveLength(1);
  });

  it('京东应输出 main_white + main_text 两个主图 slot', () => {
    const mappings = registry.getMapping('JD');
    const mainTypes = getMainSlotTypes(mappings);
    expect(mainTypes).toContain('main_white');
    expect(mainTypes).toContain('main_text');
    expect(mainTypes).toHaveLength(2);
  });

  it('抖音应输出 main_white + main_text 两个主图 slot', () => {
    const mappings = registry.getMapping('DOUYIN');
    const mainTypes = getMainSlotTypes(mappings);
    expect(mainTypes).toContain('main_white');
    expect(mainTypes).toContain('main_text');
    expect(mainTypes).toHaveLength(2);
  });

  it('每个 slot 应有 maxCount/minCount/required/anchor 字段', () => {
    for (const platform of ALL_PLATFORMS) {
      const mappings = registry.getMapping(platform);
      const slots = simulatePlanSlots(mappings);

      expect(slots.length).toBeGreaterThanOrEqual(1);

      for (const slot of slots) {
        expect(slot).toHaveProperty('maxCount');
        expect(slot).toHaveProperty('minCount');
        expect(slot).toHaveProperty('isRequired');
        expect(slot).toHaveProperty('isAnchor');
        expect(typeof slot.maxCount).toBe('number');
        expect(typeof slot.minCount).toBe('number');
        expect(slot.maxCount).toBe(1);
      }
    }
  });

  it('required slot 的 minCount=1, 非 required 的 minCount=0', () => {
    for (const platform of ALL_PLATFORMS) {
      const mappings = registry.getMapping(platform);
      const slots = simulatePlanSlots(mappings);

      for (const slot of slots) {
        if (slot.isRequired) {
          expect(slot.minCount).toBe(1);
        } else {
          expect(slot.minCount).toBe(0);
        }
      }
    }
  });

  it('锚点 slot 排在首位且 anchor=true', () => {
    for (const platform of ALL_PLATFORMS) {
      const mappings = registry.getMapping(platform);
      const slots = simulatePlanSlots(mappings);

      if (slots.length === 0) continue;

      expect(slots[0].isAnchor).toBe(true);
    }
  });

  it('每个平台仅一个锚点 slot', () => {
    for (const platform of ALL_PLATFORMS) {
      const mappings = registry.getMapping(platform);
      const slots = simulatePlanSlots(mappings);
      const anchorCount = slots.filter((s) => s.isAnchor).length;
      expect(anchorCount).toBe(1);
    }
  });

  it('拼多多无 main_white 时 firstRequired 作为锚点', () => {
    const mappings = registry.getMapping('PINDUODUO');
    expect(mappings.find((m) => m.unifiedSlotType === 'main_white')).toBeUndefined();
    const slots = simulatePlanSlots(mappings);
    expect(slots[0].isAnchor).toBe(true);
    expect(slots[0].slotType).toBe('main_text');
  });

  it('A层国内平台 slot 数量 ≥ B层海外平台 slot 数量', () => {
    const chineseSlots = CHINESE_TIER.map((p) => registry.getMapping(p).length);
    const intlSlots = INTERNATIONAL_TIER.map((p) => registry.getMapping(p).length);
    const chineseMin = Math.min(...chineseSlots);
    const intlMax = Math.max(...intlSlots);
    expect(chineseMin).toBeGreaterThanOrEqual(intlMax);
  });

  it('海外平台主图都只有 main_white 无 main_text', () => {
    for (const platform of WESTERN_PLATFORMS) {
      const mappings = registry.getMapping(platform);
      const mainTypes = getMainSlotTypes(mappings);
      expect(mainTypes).toContain('main_white');
      expect(mainTypes).not.toContain('main_text');
    }
  });

  it('非锚点 slot 排在锚点之后', () => {
    for (const platform of ALL_PLATFORMS) {
      const mappings = registry.getMapping(platform);
      const slots = simulatePlanSlots(mappings);

      let foundNonAnchor = false;
      for (const slot of slots) {
        if (foundNonAnchor) {
          expect(slot.isAnchor).toBe(false);
        }
        if (!slot.isAnchor) {
          foundNonAnchor = true;
        }
      }
    }
  });
});
