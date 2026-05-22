import { describe, it, expect } from 'vitest';
import { CATEGORY_INJECTIONS_V2, getCategoryInjection } from './category-injection';
import { PromptCompiler } from './prompt-compiler';

const compiler = new PromptCompiler() as unknown as {
  buildSlotGoal(input: { slotType: string; slotPurpose?: string; keyMessages?: string[] }, isNonCN?: boolean): string;
  buildOutputConstraint(rule: Record<string, unknown>, slotType: string, isNonCN?: boolean): string;
  buildCategoryInjection(category: string): string;
  postCompileCheck(text: string, sections: { section3_platformConstraint: string; section7_outputConstraint: string }, forbiddenWords?: string[]): string[];
};

const AMAZON_RULE = {
  platformName: 'AMAZON',
  mainImageSize: '2000x2000',
  mainImageRatio: '1:1',
  textAllowedOnMainImage: false,
  whiteBackgroundRequired: true,
  allowedFormats: JSON.stringify(['JPEG', 'PNG']),
  maxFileSizeMb: 5,
  forbiddenWords: JSON.stringify(['best', 'cheapest', 'guaranteed']),
  absoluteTermsForbidden: true,
  medicalTermsForbidden: true,
};

describe('CATEGORY_INJECTIONS_V2 — 四要素品类注入', () => {
  it('美妆个护 V2 包含四要素', () => {
    const inj = CATEGORY_INJECTIONS_V2['美妆个护'];
    expect(inj.composition).toContain('构图');
    expect(inj.lighting).toContain('5500K');
    expect(inj.background).toContain('#FFFFFF');
    expect(inj.style).toContain('棚拍');
  });

  it('3C数码 V2 包含四要素', () => {
    const inj = CATEGORY_INJECTIONS_V2['3C数码'];
    expect(inj.composition).toContain('45°');
    expect(inj.lighting).toContain('侧光');
    expect(inj.background).toContain('#333333');
    expect(inj.style).toContain('科技感');
  });

  it('美妆个护 getCategoryInjection 返回四要素格式化文本', () => {
    const result = getCategoryInjection('美妆个护');
    expect(result).toContain('构图：');
    expect(result).toContain('光线：');
    expect(result).toContain('背景：');
    expect(result).toContain('风格：');
  });

  it('3C数码 getCategoryInjection 返回四要素格式化文本', () => {
    const result = getCategoryInjection('3C数码');
    expect(result).toContain('构图：');
    expect(result).toContain('光线：');
    expect(result).toContain('背景：');
    expect(result).toContain('风格：');
  });

  it('未知类目 fallback 到 V1 兜底', () => {
    const result = getCategoryInjection('未知类目ABC');
    expect(result).toContain('产品清晰展示');
    expect(result).not.toContain('构图：');
  });

  it('所有 10 个品类 V2 都有四要素', () => {
    const keys = Object.keys(CATEGORY_INJECTIONS_V2);
    expect(keys.length).toBe(10);
    for (const key of keys) {
      const inj = CATEGORY_INJECTIONS_V2[key];
      expect(inj.composition).toBeTruthy();
      expect(inj.lighting).toBeTruthy();
      expect(inj.background).toBeTruthy();
      expect(inj.style).toBeTruthy();
    }
  });
});

describe('PromptCompiler V2 — 多语言策略', () => {
  it('英文语言：段6 使用英文 Slot Goal', () => {
    const result = compiler.buildSlotGoal({ slotType: 'main_white' }, true);
    expect(result).toContain('Slot Goal');
    expect(result).toContain('White Background Main Image');
    expect(result).toContain('Pure Product Display');
    expect(result).not.toContain('图位目标');
  });

  it('中文语言：段6 使用中文', () => {
    const result = compiler.buildSlotGoal({ slotType: 'main_white' }, false);
    expect(result).toContain('图位目标');
    expect(result).toContain('白底主图');
    expect(result).not.toContain('Slot Goal');
  });

  it('英文语言：段7 使用英文 Output Constraints', () => {
    const result = compiler.buildOutputConstraint(AMAZON_RULE, 'main_white', true);
    expect(result).toContain('Output Constraints');
    expect(result).toContain('Negative List');
    expect(result).toContain('Do NOT add');
    expect(result).not.toContain('输出约束');
    expect(result).not.toContain('否定清单');
  });

  it('中文语言：段7 使用中文', () => {
    const result = compiler.buildOutputConstraint(AMAZON_RULE, 'main_white', false);
    expect(result).toContain('输出约束');
    expect(result).toContain('否定清单');
    expect(result).toContain('不要添加');
    expect(result).not.toContain('Output Constraints');
  });

  it('英文语言：feature slot 也有英文翻译', () => {
    const result = compiler.buildSlotGoal({
      slotType: 'feature',
      slotPurpose: 'Show waterproof feature',
      keyMessages: ['IPX7', 'Underwater'],
    }, true);
    expect(result).toContain('Slot Goal');
    expect(result).toContain('Feature Highlight');
    expect(result).toContain('Goal: Show waterproof feature');
    expect(result).toContain('Key Messages: IPX7, Underwater');
  });
});

describe('PromptCompiler V2 — 拼装后检查增强', () => {
  it('禁用词冲突：包含 forbidden 词汇触发警告', () => {
    const warnings = compiler.postCompileCheck(
      'This is the best product ever',
      { section3_platformConstraint: '平台约束', section7_outputConstraint: '输出约束\n不要添加水印' },
      ['best', 'cheapest', 'guaranteed'],
    );
    expect(warnings.some(w => w.includes('禁用词冲突'))).toBe(true);
    expect(warnings.some(w => w.includes('best'))).toBe(true);
  });

  it('禁用词无冲突：不包含 forbidden 词汇无警告', () => {
    const warnings = compiler.postCompileCheck(
      'Normal product description',
      { section3_platformConstraint: '平台约束', section7_outputConstraint: '输出约束\n不要添加水印' },
      ['best', 'cheapest'],
    );
    expect(warnings.some(w => w.includes('禁用词冲突'))).toBe(false);
  });

  it('段间指令冲突：段3禁止文字 + 段7含文字限制 → 警告', () => {
    const warnings = compiler.postCompileCheck(
      'product image',
      {
        section3_platformConstraint: '平台约束\n文字规则：严格禁止任何文字、水印、边框、Logo',
        section7_outputConstraint: '输出约束\n文字限制：产品占比35-40%',
      },
    );
    expect(warnings.some(w => w.includes('段间指令冲突'))).toBe(true);
  });

  it('段间无冲突：段3禁止文字 + 段7英文否定清单 → 无警告', () => {
    const warnings = compiler.postCompileCheck(
      'product image',
      {
        section3_platformConstraint: '平台约束\n文字规则：严格禁止任何文字、水印、边框、Logo',
        section7_outputConstraint: 'Output Constraints\nNegative List: Do NOT add: watermarks',
      },
    );
    expect(warnings.some(w => w.includes('段间指令冲突'))).toBe(false);
  });

  it('段间无冲突：段3允许文字 + 段7含文字限制 → 无警告', () => {
    const warnings = compiler.postCompileCheck(
      'product image',
      {
        section3_platformConstraint: '平台约束\n文字规则：允许文字',
        section7_outputConstraint: '输出约束\n文字限制：产品占比35-40%',
      },
    );
    expect(warnings.some(w => w.includes('段间指令冲突'))).toBe(false);
  });

  it('空 forbiddenWords 不触发禁用词检测', () => {
    const warnings = compiler.postCompileCheck(
      'the best product',
      { section3_platformConstraint: '平台约束', section7_outputConstraint: '输出约束' },
      [],
    );
    expect(warnings.some(w => w.includes('禁用词冲突'))).toBe(false);
  });
});

describe('PromptCompiler V2 — 返回结构', () => {
  it('promptVersion 为 2.0.0，含 meta 编译元信息', async () => {
    const { prisma } = await import('@/lib/prisma');
    const original = prisma.product.findUnique;
    prisma.product.findUnique = (() => Promise.resolve({
      id: 'p1',
      productName: 'Test',
      category: '美妆个护',
      mainColor: '#FF0000',
      shapeType: '圆柱形',
      primaryLanguage: 'en',
    })) as unknown as typeof original;

    const originalRule = prisma.platformRulePack.findUnique;
    prisma.platformRulePack.findUnique = (() => Promise.resolve(AMAZON_RULE)) as unknown as typeof originalRule;

    try {
      const realCompiler = new PromptCompiler();
      const result = await realCompiler.compile({
        productId: 'p1',
        platformPackId: 'AMAZON',
        slotType: 'main_white',
        language: 'en',
      });
      expect(result.promptVersion).toBe('2.0.0');
      expect(result.changelog).toBeTruthy();
      expect(result.changelog).toContain('v2.0.0');
      expect(typeof result.renderPlan.overlayRequired).toBe('boolean');
      expect(result.meta).toBeDefined();
      expect(result.meta.styleSource).toBe('default');
      expect(result.meta.seriesPackVersion).toBeUndefined();
      expect(result.meta.brandPackId).toBeUndefined();
    } finally {
      prisma.product.findUnique = original;
      prisma.platformRulePack.findUnique = originalRule;
    }
  });

  it('compile 无系列包时 section1 为默认保守值', async () => {
    const { prisma } = await import('@/lib/prisma');
    const original = prisma.product.findUnique;
    prisma.product.findUnique = (() => Promise.resolve({
      id: 'p1',
      productName: 'Test',
      category: '美妆个护',
      mainColor: '#FF0000',
      shapeType: '圆柱形',
    })) as unknown as typeof original;

    const originalRule = prisma.platformRulePack.findUnique;
    prisma.platformRulePack.findUnique = (() => Promise.resolve(AMAZON_RULE)) as unknown as typeof originalRule;

    try {
      const realCompiler = new PromptCompiler();
      const result = await realCompiler.compile({
        productId: 'p1',
        platformPackId: 'AMAZON',
        slotType: 'main_white',
      });
      expect(result.promptSections.section1_styleLock).toContain('neutral product photography, clean commercial style');
      expect(result.meta.styleSource).toBe('default');
    } finally {
      prisma.product.findUnique = original;
      prisma.platformRulePack.findUnique = originalRule;
    }
  });
});
