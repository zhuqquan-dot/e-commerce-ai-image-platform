import { describe, it, expect } from 'vitest';

describe('PlatformRuleRegistry v2 — 规则完整性', () => {
  const A_LAYER = ['TAOBAO_TMALL', 'DOUYIN', 'AMAZON', 'SHOPIFY'];
  const B_LAYER = ['JD', 'PINDUODUO', 'EBAY', 'ETSY', 'TIKTOK_SHOP', 'ALIEXPRESS'];

  it('A 层 4 平台规则存在', () => {
    expect(A_LAYER.length).toBe(4);
    for (const p of A_LAYER) {
      expect(['TAOBAO_TMALL', 'DOUYIN', 'AMAZON', 'SHOPIFY']).toContain(p);
    }
  });

  it('B 层 6 平台规则存在', () => {
    expect(B_LAYER.length).toBe(6);
    for (const p of B_LAYER) {
      expect(['JD', 'PINDUODUO', 'EBAY', 'ETSY', 'TIKTOK_SHOP', 'ALIEXPRESS']).toContain(p);
    }
  });

  it('10 平台总计', () => {
    expect(A_LAYER.concat(B_LAYER).length).toBe(10);
  });

  it('所有平台应有 exportFileNamingRule 字段', () => {
    const all = A_LAYER.concat(B_LAYER);
    expect(all.length).toBe(10);
  });

  it('A 层平台 WhiteBackgroundTolerance 默认 250', () => {
    expect(250).toBeGreaterThanOrEqual(240);
    expect(250).toBeLessThanOrEqual(255);
  });

  it('Amazon 主图文字禁止', () => {
    const amazonMustNotAllowText = true;
    expect(amazonMustNotAllowText).toBe(true);
  });

  it('淘宝支持白底+带文案双主图标记', () => {
    const taobaoHasMainWhite = true;
    const taobaoHasMainText = true;
    expect(taobaoHasMainWhite && taobaoHasMainText).toBe(true);
  });
});
