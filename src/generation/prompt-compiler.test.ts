import { describe, it, expect } from 'vitest';
import { PromptCompiler } from './prompt-compiler';

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
  priceOverlayZone: null,
};

const TAOBAO_RULE = {
  platformName: 'TAOBAO_TMALL',
  mainImageSize: '800x800',
  mainImageRatio: '1:1',
  textAllowedOnMainImage: false,
  whiteBackgroundRequired: true,
  allowedFormats: JSON.stringify(['JPEG', 'PNG']),
  maxFileSizeMb: 3,
  forbiddenWords: JSON.stringify(['第一', '最好', '全网最低', '国家级', '最']),
  absoluteTermsForbidden: true,
  medicalTermsForbidden: true,
  priceOverlayZone: { x: 0, y: 0, width: 200, height: 100 },
};

describe('PromptCompiler — Amazon vs 淘宝 主图差异化', () => {
  const compiler = new PromptCompiler() as unknown as {
    buildPlatformConstraint(rule: Record<string, unknown>, slotType: string): string;
    buildOutputConstraint(rule: Record<string, unknown>, slotType: string): string;
    buildTruthPack(product: Record<string, unknown>): string;
    buildStyleLock(seriesPack: Record<string, unknown> | null, brandPack: Record<string, unknown> | null): string;
    buildCategoryInjection(category: string): string;
    buildSlotGoal(input: { slotType: string; slotPurpose?: string; keyMessages?: string[] }): string;
    buildBrandTone(brandPack: Record<string, unknown> | null): string;
    postCompileCheck(text: string, sections: { section7_outputConstraint: string }): string[];
  };

  describe('buildPlatformConstraint — 平台约束段', () => {
    it('Amazon 主图：禁止文字，85%+ 产品占比，无价格叠加区警告', () => {
      const result = compiler.buildPlatformConstraint(AMAZON_RULE, 'main_white');
      expect(result).toContain('主图规则');
      expect(result).toContain('纯白背景 RGB(255,255,255)');
      expect(result).toContain('严格禁止任何文字、水印、边框、Logo');
      expect(result).toContain('85%+');
      expect(result).toContain('2000x2000');
      expect(result).toContain('1:1');
      expect(result).toContain('best');
      expect(result).toContain('禁止绝对化用语');
      expect(result).toContain('禁止医疗功效声明');
      expect(result).toContain('JPEG/PNG');
      expect(result).not.toContain('避让');
    });

    it('淘宝主图：禁止文字，85%+，含价格叠加区避让警告', () => {
      const result = compiler.buildPlatformConstraint(TAOBAO_RULE, 'main_white');
      expect(result).toContain('主图规则');
      expect(result).toContain('纯白背景 RGB(255,255,255)');
      expect(result).toContain('严格禁止任何文字、水印、边框、Logo');
      expect(result).toContain('85%+');
      expect(result).toContain('800x800');
      expect(result).toContain('第一');
      expect(result).toContain('禁止绝对化用语');
      expect(result).toContain('避让顶部中央约200×100区域（平台价格叠加区）');
    });

    it('Amazon 辅图：不包含主图专属规则', () => {
      const result = compiler.buildPlatformConstraint(AMAZON_RULE, 'feature');
      expect(result).toContain('辅图规则');
      expect(result).not.toContain('纯白背景');
      expect(result).not.toContain('85%+');
    });

    it('淘宝辅图：不包含价格叠加区警告', () => {
      const result = compiler.buildPlatformConstraint(TAOBAO_RULE, 'scene');
      expect(result).toContain('辅图规则');
      expect(result).not.toContain('避让顶部中央');
    });
  });

  describe('buildOutputConstraint — 输出约束段（否定清单）', () => {
    it('Amazon 主图：留白45%+，产品占比85%+', () => {
      const result = compiler.buildOutputConstraint(AMAZON_RULE, 'main_white');
      expect(result).toContain('输出约束');
      expect(result).toContain('1:1');
      expect(result).toContain('留白：45%+');
      expect(result).toContain('85%+');
      expect(result).toContain('否定清单');
      expect(result).toContain('不要添加水印、虚假logo、多余文字、变形、模糊、噪点');
    });

    it('淘宝辅图：留白30%+，产品占比20-25%', () => {
      const result = compiler.buildOutputConstraint(TAOBAO_RULE, 'scene');
      expect(result).toContain('输出约束');
      expect(result).toContain('留白：30%+');
      expect(result).toContain('20-25%');
    });
  });

  describe('buildTruthPack — 商品事实段', () => {
    it('完整商品字段全部拼接', () => {
      const product = {
        productName: '测试电动牙刷',
        mainColor: '#FF6B35',
        secondaryColor: '#FFFFFF',
        shapeType: '圆柱形',
        material: 'ABS+硅胶',
        surfaceMaterial: '磨砂表面',
        textureFeature: '细颗粒纹理',
        edgeFeature: '圆角过渡',
        coreSellingPoint1: '声波震动48000次/分钟',
        coreSellingPoint2: 'IPX7防水',
        coreSellingPoint3: '续航90天',
        logoPosition: '手柄底部',
        mustNotChangeFeatures: '刷头形状',
        mustNotDisappearFeatures: 'LED指示灯',
        mustNotAddFeatures: '多余的按钮',
      };
      const result = compiler.buildTruthPack(product);
      expect(result).toContain('商品事实');
      expect(result).toContain('测试电动牙刷');
      expect(result).toContain('主色：#FF6B35');
      expect(result).toContain('辅色：#FFFFFF');
      expect(result).toContain('外观：圆柱形');
      expect(result).toContain('材质：ABS+硅胶');
      expect(result).toContain('表面材质：磨砂表面');
      expect(result).toContain('纹理：细颗粒纹理');
      expect(result).toContain('边缘特征：圆角过渡');
      expect(result).toContain('卖点1：声波震动48000次/分钟');
      expect(result).toContain('禁止漂移：刷头形状');
      expect(result).toContain('禁止消失：LED指示灯');
      expect(result).toContain('禁止新增：多余的按钮');
    });

    it('缺失字段不输出对应行', () => {
      const product = {
        productName: '极简商品',
        mainColor: null,
        shapeType: null,
      };
      const result = compiler.buildTruthPack(product);
      expect(result).toContain('极简商品');
      expect(result).not.toContain('主色');
      expect(result).not.toContain('外观');
    });

    it('hex 颜色自动去除 # 前缀重复', () => {
      const product = { productName: 'X', mainColor: '#ABC123' };
      const result = compiler.buildTruthPack(product);
      expect(result).toContain('#ABC123');
    });
  });

  describe('buildStyleLock — 风格锁定段', () => {
    it('seriesPack 为 null 返回默认保守值', () => {
      const result = compiler.buildStyleLock(null, null);
      expect(result).toContain('Style Lock');
      expect(result).toContain('neutral product photography, clean commercial style');
    });

    it('完整 seriesPack 输出色板+背景+光线+风格文本', () => {
      const sp = {
        seriesName: '夏日清爽系列',
        fixedPalette: JSON.stringify(['#FFD700', '#00BFFF', '#FFFFFF']),
        backgroundSystem: '纯白/浅蓝渐变',
        lightingSystem: '柔光顶光+侧补光',
        styleLockText: '画面需呈现北欧简约风格，无多余装饰，线条干净利落',
      };
      const result = compiler.buildStyleLock(sp, null);
      expect(result).toContain('Style Lock');
      expect(result).toContain('夏日清爽系列');
      expect(result).toContain('#FFD700、#00BFFF、#FFFFFF');
      expect(result).toContain('纯白/浅蓝渐变');
      expect(result).toContain('柔光顶光+侧补光');
      expect(result).toContain('北欧简约风格');
      expect(result).toContain('禁止：色板变化、字体混用、背景跳变、光线不一致');
    });

    it('seriesPack + brandPack 合并品牌语气到段1', () => {
      const sp = {
        seriesName: '科技旗舰系列',
        fixedPalette: JSON.stringify(['#000000', '#00FF00']),
        backgroundSystem: '深色渐变',
        lightingSystem: '侧光+底部氛围光',
        styleLockText: '赛博朋克风格，霓虹灯效，高对比度',
      };
      const bp = {
        brandTone: '专业科技感，简洁有力',
        brandVisualBoundary: '禁止使用卡通/手绘风格',
      };
      const result = compiler.buildStyleLock(sp, bp);
      expect(result).toContain('Style Lock');
      expect(result).toContain('赛博朋克风格');
      expect(result).toContain('品牌语气：专业科技感，简洁有力');
      expect(result).toContain('视觉边界：禁止使用卡通/手绘风格');
    });

    it('seriesPack 存在但 brandPack 为 null 不含品牌语气行', () => {
      const sp = {
        seriesName: '极简系列',
        fixedPalette: JSON.stringify(['#FFFFFF']),
        styleLockText: '极简白',
      };
      const result = compiler.buildStyleLock(sp, null);
      expect(result).not.toContain('品牌语气');
      expect(result).not.toContain('视觉边界');
    });
  });

  describe('buildCategoryInjection — 品类注入段', () => {
    it('美妆个护类目返回 V2 四要素规则', () => {
      const result = compiler.buildCategoryInjection('美妆个护');
      expect(result).toContain('品类优化');
      expect(result).toContain('构图：');
      expect(result).toContain('光线：');
      expect(result).toContain('背景：');
      expect(result).toContain('风格：');
      expect(result).toContain('#FFFFFF');
    });

    it('3C数码类目返回 V2 四要素规则', () => {
      const result = compiler.buildCategoryInjection('3C数码');
      expect(result).toContain('品类优化');
      expect(result).toContain('构图：');
      expect(result).toContain('金属质感');
      expect(result).toContain('#333333');
    });

    it('未知类目返回兜底规则', () => {
      const result = compiler.buildCategoryInjection('未知类目');
      expect(result).toContain('品类优化');
      expect(result).toContain('产品清晰展示');
    });
  });

  describe('buildSlotGoal — 图位目标段', () => {
    it('main_white 输出白底主图描述', () => {
      const result = compiler.buildSlotGoal({ slotType: 'main_white' });
      expect(result).toContain('图位目标');
      expect(result).toContain('白底主图');
      expect(result).toContain('纯商品展示');
    });

    it('feature 输出功能卖点图描述', () => {
      const result = compiler.buildSlotGoal({
        slotType: 'feature',
        slotPurpose: '展示3个核心功能',
        keyMessages: ['防水', '长续航', '静音'],
      });
      expect(result).toContain('功能卖点图');
      expect(result).toContain('展示3个核心功能');
      expect(result).toContain('防水、长续航、静音');
    });

    it('未知 slotType 回退到原始值', () => {
      const result = compiler.buildSlotGoal({ slotType: 'custom_slot' });
      expect(result).toContain('custom_slot');
    });
  });

  describe('buildBrandTone — 品牌语气段', () => {
    it('brandPack 为 null 返回空字符串', () => {
      expect(compiler.buildBrandTone(null)).toBe('');
    });

    it('完整 brandPack 输出品牌约束', () => {
      const bp = {
        brandPrimaryColor: '#E60012',
        brandTone: '专业科技感，简洁有力',
        brandVisualBoundary: '禁止使用卡通/手绘风格',
        brandForbiddenWords: '廉价、低端、山寨',
      };
      const result = compiler.buildBrandTone(bp);
      expect(result).toContain('品牌语气');
      expect(result).toContain('#E60012');
      expect(result).toContain('专业科技感');
      expect(result).toContain('禁止使用卡通/手绘风格');
      expect(result).toContain('廉价、低端、山寨');
    });
  });

  describe('postCompileCheck — 拼装后检查', () => {
    it('长 Prompt 触发 token 警告', () => {
      const longText = 'x'.repeat(7000);
      const result = compiler.postCompileCheck(longText, { section7_outputConstraint: '否定清单：不要添加水印' });
      const tokenWarn = result.find((w: string) => w.includes('tokens'));
      expect(tokenWarn).toBeDefined();
    });

    it('短 Prompt 不触发 token 警告', () => {
      const shortText = 'x'.repeat(100);
      const result = compiler.postCompileCheck(shortText, { section7_outputConstraint: '否定清单：不要添加水印' });
      const tokenWarn = result.find((w: string) => w.includes('tokens'));
      expect(tokenWarn).toBeUndefined();
    });

    it('含残留占位符触发警告', () => {
      const text = '请生成 [商品名称] 的图片';
      const result = compiler.postCompileCheck(text, { section7_outputConstraint: '否定清单：不要添加水印' });
      expect(result.some((w: string) => w.includes('占位符'))).toBe(true);
    });

    it('缺少否定清单触发警告', () => {
      const result = compiler.postCompileCheck('正常文本', { section7_outputConstraint: '输出约束\n比例：1:1' });
      expect(result.some((w: string) => w.includes('否定清单'))).toBe(true);
    });

    it('正常 Prompt 无警告', () => {
      const result = compiler.postCompileCheck(
        '请生成商品主图，纯白背景',
        { section7_outputConstraint: '输出约束\n不要添加水印、虚假logo' },
      );
      expect(result.length).toBe(0);
    });
  });

  describe('七段结构完整性', () => {
    it('buildPlatformConstraint 用于 main_white 必含六项要素', () => {
      const result = compiler.buildPlatformConstraint(AMAZON_RULE, 'main_white');
      expect(result).toContain('平台约束');
      expect(result).toContain('主图规则');
      expect(result).toContain('文字规则');
      expect(result).toContain('产品占比');
      expect(result).toContain('尺寸');
      expect(result).toContain('格式');
    });

    it('buildOutputConstraint 必含否定清单', () => {
      const result = compiler.buildOutputConstraint(AMAZON_RULE, 'main_white');
      expect(result).toContain('否定清单');
      expect(result).toContain('不要');
    });
  });
});
