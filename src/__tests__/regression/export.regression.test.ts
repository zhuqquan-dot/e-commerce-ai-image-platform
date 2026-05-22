import { describe, it, expect } from 'vitest';
import { ExportRuleRegistry } from '@/delivery/export-rule-registry';

const registry = new ExportRuleRegistry();

describe('导出回归 — 10平台命名规则完整性', () => {
  const platforms = ['AMAZON', 'TAOBAO_TMALL', 'DOUYIN', 'JD', 'PINDUODUO', 'SHOPIFY', 'EBAY', 'ETSY', 'TIKTOK_SHOP', 'ALIEXPRESS'];

  it('10 平台全部有导出规则', () => {
    for (const p of platforms) {
      const rule = registry.getRule(p);
      expect(rule, `Missing rule for ${p}`).toBeDefined();
    }
  });

  it('每个平台命名模板非空', () => {
    for (const p of platforms) {
      const rule = registry.getRule(p)!;
      expect(rule.namingTemplate.length).toBeGreaterThan(0);
    }
  });

  it('每个平台 sortOrder 非空', () => {
    for (const p of platforms) {
      const rule = registry.getRule(p)!;
      expect(rule.sortOrder.length).toBeGreaterThan(0);
    }
  });

  it('每个平台 deliveryNotes 完整', () => {
    for (const p of platforms) {
      const rule = registry.getRule(p)!;
      expect(rule.deliveryNotes).toBeDefined();
      expect(typeof rule.deliveryNotes.whiteBgRequired).toBe('boolean');
      expect(typeof rule.deliveryNotes.textAllowed).toBe('boolean');
    }
  });

  it('Amazon formatFileName 正确', () => {
    const name = registry.formatFileName('AMAZON', '蓝牙音箱', 'feature', 'jpg');
    expect(name).toContain('蓝牙音箱');
    expect(name).toContain('.jpg');
  });

  it('淘宝 formatFileName 正确', () => {
    const name = registry.formatFileName('TAOBAO_TMALL', '精华液', 'main_white', 'jpg');
    expect(name).toContain('精华液');
  });
});
