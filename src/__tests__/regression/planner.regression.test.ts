import { describe, it, expect } from 'vitest';
import { SlotMappingRegistry } from '@/planning/slot-mapping-registry';

const registry = new SlotMappingRegistry();

describe('规划回归 — 固定商品×固定平台', () => {
  it('Amazon: 6 slots, main_white anchor', () => {
    const mapping = registry.getMapping('AMAZON');
    expect(mapping.length).toBeGreaterThanOrEqual(5);
    expect(mapping[0].isAnchor).toBe(true);
    expect(mapping[0].unifiedSlotType).toBe('main_white');
  });

  it('淘宝: main_white + main_text 双主图', () => {
    const mapping = registry.getMapping('TAOBAO_TMALL');
    const types = mapping.map(m => m.unifiedSlotType);
    expect(types).toContain('main_white');
    expect(types).toContain('main_text');
    expect(mapping[0].unifiedSlotType).toBe('main_white');
    expect(mapping[0].isAnchor).toBe(true);
  });

  it('抖音: 必选≥3个', () => {
    const mapping = registry.getMapping('DOUYIN');
    const required = mapping.filter(m => m.isRequired);
    expect(required.length).toBeGreaterThanOrEqual(3);
  });

  it('Shopify: 全部6个slotType', () => {
    const mapping = registry.getMapping('SHOPIFY');
    expect(mapping.length).toBeGreaterThanOrEqual(6);
  });
});
