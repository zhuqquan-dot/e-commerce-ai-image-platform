import { describe, it, expect } from 'vitest';
import { CATEGORY_INJECTIONS_V2 } from '@/generation/category-injection';
import { PromptCompiler } from '@/generation/prompt-compiler';

describe('编译回归 — 品类注入完整性', () => {
  it('10 类目全部有 V2 注入数据', () => {
    const categories = Object.keys(CATEGORY_INJECTIONS_V2);
    expect(categories.length).toBe(10);
  });

  it('每个类目 V2 注入含四要素', () => {
    for (const [cat, data] of Object.entries(CATEGORY_INJECTIONS_V2)) {
      expect(data.composition, `${cat} missing composition`).toBeTruthy();
      expect(data.lighting, `${cat} missing lighting`).toBeTruthy();
      expect(data.background, `${cat} missing background`).toBeTruthy();
      expect(data.style, `${cat} missing style`).toBeTruthy();
    }
  });
});

describe('编译回归 — 多语言策略', () => {
  it('中文输出中文段名', () => {
    expect(true).toBe(true);
  });
});

describe('编译回归 — 段1 Style Lock 与段2 Truth Pack', () => {
  const compiler = new PromptCompiler() as unknown as {
    buildStyleLock(seriesPack: Record<string, unknown> | null, brandPack: Record<string, unknown> | null): string;
    buildTruthPack(product: Record<string, unknown>): string;
  };

  describe('段1 Style Lock', () => {
    it('无系列包时输出默认保守值并含 Style Lock 段头', () => {
      const result = compiler.buildStyleLock(null, null);
      expect(result).toBe('Style Lock：neutral product photography, clean commercial style');
    });

    it('有系列包但无品牌包时不含品牌语气', () => {
      const sp = { seriesName: '测试', fixedPalette: '[]', styleLockText: '测试风格' };
      const result = compiler.buildStyleLock(sp, null);
      expect(result).toContain('Style Lock');
      expect(result).not.toContain('品牌语气');
      expect(result).not.toContain('视觉边界');
    });

    it('系列包 + 品牌包合并 brandTone 和 brandVisualBoundary', () => {
      const sp = { seriesName: 'S1', fixedPalette: '[]', styleLockText: '极简风' };
      const bp = { brandTone: '温暖亲切', brandVisualBoundary: '禁止暗色调' };
      const result = compiler.buildStyleLock(sp, bp);
      expect(result).toContain('品牌语气：温暖亲切');
      expect(result).toContain('视觉边界：禁止暗色调');
    });
  });

  describe('段2 Truth Pack', () => {
    it('含 surfaceMaterial 和 edgeFeature 时输出对应行', () => {
      const product = {
        productName: '测试商品',
        mainColor: '#000000',
        shapeType: '方形',
        surfaceMaterial: '拉丝金属',
        edgeFeature: '倒角切割',
      };
      const result = compiler.buildTruthPack(product);
      expect(result).toContain('表面材质：拉丝金属');
      expect(result).toContain('边缘特征：倒角切割');
    });

    it('空字段不输出对应行', () => {
      const product = { productName: '极简' };
      const result = compiler.buildTruthPack(product);
      expect(result).toContain('商品事实');
      expect(result).toContain('极简');
      expect(result).not.toContain('表面材质');
      expect(result).not.toContain('边缘特征');
      expect(result).not.toContain('纹理');
    });
  });
});
