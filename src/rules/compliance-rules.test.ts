import { describe, it, expect } from 'vitest';
import { getComplianceRuleFromDB } from './compliance-rules';

describe('ComplianceRule — 合规规则结构化', () => {
  const AMAZON_RAW = {
    platformName: 'AMAZON',
    whiteBackgroundRequired: true,
    whiteBackgroundToleranceR: 255,
    whiteBackgroundToleranceG: 255,
    whiteBackgroundToleranceB: 255,
    textAllowedOnMainImage: false,
    textConstraints: '{"maxLines":0,"maxChars":0,"fontRequirements":"严格禁止"}',
    forbiddenElements: '["文字","水印","边框","Logo","任何叠加元素"]',
    priceOverlayZone: '{}',
    absoluteTermsForbidden: false,
    medicalTermsForbidden: false,
  };

  const TAOBAO_RAW = {
    platformName: 'TAOBAO_TMALL',
    whiteBackgroundRequired: false,
    whiteBackgroundToleranceR: 250,
    whiteBackgroundToleranceG: 250,
    whiteBackgroundToleranceB: 250,
    textAllowedOnMainImage: true,
    textConstraints: '{"maxLines":0,"maxChars":0,"fontRequirements":""}',
    forbiddenElements: '["水印","边框","第三方Logo","虚假认证标志","二维码"]',
    priceOverlayZone: '{"x":0,"y":0,"width":200,"height":100,"description":"平台价格叠加区"}',
    absoluteTermsForbidden: true,
    medicalTermsForbidden: true,
  };

  it('Amazon: whiteBg=true, text=false, 5 forbiddenElements', () => {
    const rule = getComplianceRuleFromDB(AMAZON_RAW);
    expect(rule.whiteBg.required).toBe(true);
    expect(rule.whiteBg.tolerance.rMin).toBe(255);
    expect(rule.text.allowed).toBe(false);
    expect(rule.forbiddenElements.length).toBe(5);
    expect(rule.priceOverlayZone).toBeNull();
    expect(rule.absoluteTermsForbidden).toBe(false);
  });

  it('淘宝: whiteBg=false, text=true, priceOverlayZone存在', () => {
    const rule = getComplianceRuleFromDB(TAOBAO_RAW);
    expect(rule.whiteBg.required).toBe(false);
    expect(rule.text.allowed).toBe(true);
    expect(rule.priceOverlayZone).toBeDefined();
    expect(rule.priceOverlayZone!.description).toContain('价格叠加');
    expect(rule.absoluteTermsForbidden).toBe(true);
  });

  it('10平台合规规则结构一致', () => {
    const platforms = ['AMAZON', 'TAOBAO_TMALL', 'DOUYIN', 'JD', 'PINDUODUO', 'SHOPIFY', 'EBAY', 'ETSY', 'TIKTOK_SHOP', 'ALIEXPRESS'];
    const sampleRaw = { ...AMAZON_RAW, platformName: '' };
    for (const p of platforms) {
      sampleRaw.platformName = p;
      const rule = getComplianceRuleFromDB(sampleRaw);
      expect(rule).toHaveProperty('platform');
      expect(rule).toHaveProperty('whiteBg');
      expect(rule).toHaveProperty('text');
      expect(rule).toHaveProperty('forbiddenElements');
      expect(rule).toHaveProperty('priceOverlayZone');
      expect(rule).toHaveProperty('absoluteTermsForbidden');
    }
  });
});
