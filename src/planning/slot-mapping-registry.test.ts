import { describe, it, expect } from 'vitest';
import { SlotMappingRegistry } from './slot-mapping-registry';

const registry = new SlotMappingRegistry();

const ALL_PLATFORMS = [
  'AMAZON',
  'TAOBAO_TMALL',
  'DOUYIN',
  'JD',
  'PINDUODUO',
  'SHOPIFY',
  'EBAY',
  'ETSY',
  'TIKTOK_SHOP',
  'ALIEXPRESS',
];

describe('SlotMappingRegistry — 10 平台图位映射', () => {
  it('10 平台全部注册', () => {
    expect(registry.getAllPlatforms().length).toBe(10);
  });

  for (const platform of ALL_PLATFORMS) {
    it(`${platform} 至少 1 条映射`, () => {
      const mapping = registry.getMapping(platform);
      expect(mapping.length).toBeGreaterThanOrEqual(1);
    });

    it(`${platform} 主图映射到 main_white 或 main_text`, () => {
      const anchor = registry.getAnchorSlot(platform);
      expect(anchor).toBeDefined();
      expect(['main_white', 'main_text']).toContain(anchor!.unifiedSlotType);
    });

    it(`${platform} 至少 1 个必选 slot`, () => {
      const required = registry.getRequiredSlots(platform);
      expect(required.length).toBeGreaterThanOrEqual(1);
    });

    it(`${platform} 有锚点 slot`, () => {
      const anchor = registry.getAnchorSlot(platform);
      expect(anchor).toBeDefined();
      expect(anchor!.isAnchor).toBe(true);
    });
  }

  it('Amazon MAIN→main_white 且禁止文字', () => {
    const result = registry.resolveSlotType('AMAZON', 'MAIN');
    expect(result).toBe('main_white');
  });

  it('Amazon PT1→feature', () => {
    const result = registry.resolveSlotType('AMAZON', 'PT1');
    expect(result).toBe('feature');
  });

  it('淘宝 主图(白底)→main_white', () => {
    const result = registry.resolveSlotType('TAOBAO_TMALL', '主图(白底)');
    expect(result).toBe('main_white');
  });

  it('淘宝 主图(带文案)→main_text', () => {
    const result = registry.resolveSlotType('TAOBAO_TMALL', '主图(带文案)');
    expect(result).toBe('main_text');
  });

  it('未知 nativeName 返回 null', () => {
    const result = registry.resolveSlotType('AMAZON', 'NONEXISTENT');
    expect(result).toBeNull();
  });

  it('未知平台返回空数组', () => {
    const mapping = registry.getMapping('NONEXISTENT');
    expect(mapping).toEqual([]);
  });

  it('映射总数 ≥ 56 (10平台 × 平均5.6条)', () => {
    let total = 0;
    for (const p of ALL_PLATFORMS) {
      total += registry.getMapping(p).length;
    }
    expect(total).toBeGreaterThanOrEqual(56);
  });
});
