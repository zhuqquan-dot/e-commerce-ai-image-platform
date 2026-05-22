import { prisma } from '@/lib/prisma';
import { getCategoryInjection } from './category-injection';

export interface PromptCompileInput {
  brandPackId?: string;
  seriesPackId?: string;
  productId: string;
  platformPackId: string;
  slotType: string;
  slotPurpose?: string;
  keyMessages?: string[];
  language?: string;
}

export interface PromptSections {
  section1_styleLock: string;
  section2_truthPack: string;
  section3_platformConstraint: string;
  section4_categoryInjection: string;
  section5_brandTone: string;
  section6_slotGoal: string;
  section7_outputConstraint: string;
}

export interface PromptCompileOutput {
  promptVersion: string;
  changelog: string;
  promptText: string;
  promptSections: PromptSections;
  generationParams: { size: string; quality: string; n: number; imageUrls: string[] };
  renderPlan: { aspectRatio: string; whitespacePercent: number; productOccupancy: string; negatives: string[]; overlayRequired: boolean };
  validationWarnings: string[];
  meta: PromptCompileMeta;
}

export interface PromptCompileMeta {
  seriesPackVersion?: string;
  brandPackId?: string;
  styleSource: 'series_pack' | 'default';
}

export class PromptCompiler {
  async validateInput(input: PromptCompileInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (input.seriesPackId) {
      const sp = await prisma.seriesPack.findUnique({ where: { id: input.seriesPackId } });
      if (!sp) errors.push(`系列资产包 ${input.seriesPackId} 不存在`);
      else if (!sp.styleLockText) errors.push('系列资产包缺少 styleLockText');
    }
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) errors.push(`商品 ${input.productId} 不存在`);
    else {
      if (!product.mainColor) errors.push(`商品 "${product.productName}" 缺少主色(mainColor)`);
      if (!product.shapeType) errors.push(`商品 "${product.productName}" 缺少形状类型(shapeType)`);
    }
    const rule = await prisma.platformRulePack.findUnique({ where: { platformName: input.platformPackId } });
    if (!rule) errors.push(`平台规则 ${input.platformPackId} 不存在`);
    return { valid: errors.length === 0, errors };
  }

  async compile(input: PromptCompileInput): Promise<PromptCompileOutput> {
    const { valid, errors } = await this.validateInput(input);
    if (!valid) throw new Error(`准入检查失败: ${errors.join('; ')}`);

    const [product, platformRule] = await Promise.all([
      prisma.product.findUnique({ where: { id: input.productId } }),
      prisma.platformRulePack.findUnique({ where: { platformName: input.platformPackId } }),
    ]);
    let brandPack = null, seriesPack = null;
    if (input.brandPackId) brandPack = await prisma.brandPack.findUnique({ where: { id: input.brandPackId } });
    if (input.seriesPackId) seriesPack = await prisma.seriesPack.findUnique({ where: { id: input.seriesPackId } });

    const language = input.language || (product as Record<string, unknown>).primaryLanguage as string || 'zh';
    const isNonCN = language !== 'zh' && language !== 'zh-CN';

    const sections: PromptSections = {
      section1_styleLock: this.buildStyleLock(seriesPack, brandPack),
      section2_truthPack: this.buildTruthPack(product!),
      section3_platformConstraint: this.buildPlatformConstraint(platformRule!, input.slotType),
      section4_categoryInjection: this.buildCategoryInjection(product!.category),
      section5_brandTone: this.buildBrandTone(brandPack),
      section6_slotGoal: this.buildSlotGoal(input, isNonCN),
      section7_outputConstraint: this.buildOutputConstraint(platformRule!, input.slotType, isNonCN),
    };

    const promptText = [
      sections.section1_styleLock,
      sections.section2_truthPack,
      sections.section3_platformConstraint,
      sections.section4_categoryInjection,
      sections.section5_brandTone,
      sections.section6_slotGoal,
      sections.section7_outputConstraint,
    ].filter(Boolean).join('\n\n');

    const size = `${platformRule!.mainImageSize}`.replace('x', '×');
    const imageUrls: string[] = [];
    if (product!.frontRefImage) imageUrls.push(product!.frontRefImage);
    if (product!.angle45RefImage) imageUrls.push(product!.angle45RefImage);
    if (product!.sideRefImage) imageUrls.push(product!.sideRefImage);
    if (product!.backRefImage) imageUrls.push(product!.backRefImage);

    const forbiddenWords = JSON.parse(platformRule!.forbiddenWords || '[]') as string[];

    const renderPlan = {
      aspectRatio: platformRule!.mainImageRatio,
      whitespacePercent: platformRule!.textAllowedOnMainImage ? 30 : 45,
      productOccupancy: platformRule!.textAllowedOnMainImage ? '35-40%' : '85%+',
      negatives: forbiddenWords,
      overlayRequired: isNonCN && language !== 'en',
    };

    const warnings = this.postCompileCheck(promptText, sections, forbiddenWords);

    return {
      promptVersion: '2.0.0',
      changelog: 'v2.0.0: 四要素品类注入、多语言策略、禁用词/段间冲突检测',
      promptText,
      promptSections: sections,
      generationParams: {
        size,
        quality: 'medium',
        n: 1,
        imageUrls,
      },
      renderPlan,
      validationWarnings: warnings,
      meta: {
        seriesPackVersion: seriesPack?.id,
        brandPackId: brandPack?.id,
        styleSource: seriesPack ? 'series_pack' : 'default',
      },
    };
  }

  private buildStyleLock(seriesPack: Record<string, unknown> | null, brandPack: Record<string, unknown> | null): string {
    if (!seriesPack) {
      return `Style Lock：neutral product photography, clean commercial style`;
    }
    const sp = seriesPack as Record<string, string | null | undefined>;
    const bp = brandPack as Record<string, string | null | undefined> | null;
    const palette = JSON.parse(sp.fixedPalette || '[]');
    const lines: string[] = ['Style Lock：'];
    if (sp.styleLockText) lines.push(`\n${sp.styleLockText}`);
    if (sp.seriesName) lines.push(`系列名称：${sp.seriesName}`);
    if (palette.length > 0) lines.push(`固定色板：${palette.join('、')}`);
    if (sp.backgroundSystem) lines.push(`背景系统：${sp.backgroundSystem}`);
    if (sp.lightingSystem) lines.push(`光线系统：${sp.lightingSystem}`);
    if (bp?.brandTone) lines.push(`品牌语气：${bp.brandTone}`);
    if (bp?.brandVisualBoundary) lines.push(`视觉边界：${bp.brandVisualBoundary}`);
    lines.push(`禁止：色板变化、字体混用、背景跳变、光线不一致`);
    return lines.filter(Boolean).join('\n');
  }

  private buildTruthPack(product: Record<string, unknown>): string {
    const p = product as Record<string, string | null | undefined>;
    return [
      `商品事实`,
      `商品：${p.productName}`,
      p.mainColor ? `主色：#${String(p.mainColor).replace('#', '')}` : '',
      p.secondaryColor ? `辅色：#${String(p.secondaryColor).replace('#', '')}` : '',
      p.shapeType ? `外观：${p.shapeType}` : '',
      p.material ? `材质：${p.material}` : '',
      p.surfaceMaterial ? `表面材质：${p.surfaceMaterial}` : '',
      p.textureFeature ? `纹理：${p.textureFeature}` : '',
      p.edgeFeature ? `边缘特征：${p.edgeFeature}` : '',
      p.coreSellingPoint1 ? `卖点1：${p.coreSellingPoint1}` : '',
      p.coreSellingPoint2 ? `卖点2：${p.coreSellingPoint2}` : '',
      p.coreSellingPoint3 ? `卖点3：${p.coreSellingPoint3}` : '',
      p.logoPosition ? `logo位置：${p.logoPosition}` : '',
      p.mustNotChangeFeatures ? `禁止漂移：${p.mustNotChangeFeatures}` : '',
      p.mustNotDisappearFeatures ? `禁止消失：${p.mustNotDisappearFeatures}` : '',
      p.mustNotAddFeatures ? `禁止新增：${p.mustNotAddFeatures}` : '',
    ].filter(Boolean).join('\n');
  }

  private buildPlatformConstraint(rule: Record<string, unknown>, slotType: string): string {
    const r = rule as Record<string, unknown>;
    const parts: string[] = ['平台约束'];
    if (slotType === 'main_white') {
      parts.push(`主图规则：纯白背景 RGB(255,255,255)`);
      parts.push(r.textAllowedOnMainImage
        ? `文字规则：允许文字`
        : `文字规则：严格禁止任何文字、水印、边框、Logo`);
      parts.push(`产品占比：${r.textAllowedOnMainImage ? '35-40%' : '85%+'}`);
      parts.push(`尺寸：${r.mainImageSize}，比例 ${r.mainImageRatio}`);
      if (r.platformName === 'TAOBAO_TMALL' || r.platformName === 'PINDUODUO') {
        parts.push(`注意：避让顶部中央约200×100区域（平台价格叠加区）`);
      }
    } else {
      parts.push(`辅图规则`);
      parts.push(`文字规则：${r.textAllowedOnMainImage ? '允许' : '禁止'}文字`);
    }
    const forbiddenWords = JSON.parse(String(r.forbiddenWords || '[]'));
    if (forbiddenWords.length > 0) parts.push(`禁用词：${forbiddenWords.slice(0, 5).join('、')}`);
    if (r.absoluteTermsForbidden) parts.push(`禁止绝对化用语`);
    if (r.medicalTermsForbidden) parts.push(`禁止医疗功效声明`);
    const allowedFormats = JSON.parse(String(r.allowedFormats || '[]'));
    parts.push(`格式：${allowedFormats.join('/')}，文件≤${r.maxFileSizeMb}MB`);
    return parts.join('\n');
  }

  private buildCategoryInjection(category: string): string {
    const injection = getCategoryInjection(category);
    return `品类优化\n${injection}`;
  }

  private buildBrandTone(brandPack: Record<string, unknown> | null): string {
    if (!brandPack) return '';
    const bp = brandPack as Record<string, string | null | undefined>;
    return [
      `品牌语气`,
      bp.brandPrimaryColor ? `品牌主色：#${bp.brandPrimaryColor.replace('#', '')}` : '',
      bp.brandTone ? `品牌语气：${bp.brandTone}` : '',
      bp.brandVisualBoundary ? `视觉边界：${bp.brandVisualBoundary}` : '',
      bp.brandForbiddenWords ? `禁用词：${bp.brandForbiddenWords}` : '',
    ].filter(Boolean).join('\n');
  }

  private buildSlotGoal(input: PromptCompileInput, isNonCN: boolean = false): string {
    const slotNames: Record<string, string> = {
      main_white: '白底主图 — 纯商品展示，无干扰元素',
      main_text: '带文案主图 — 首图核心卖点',
      feature: '功能卖点图 — 核心功能特写',
      scene: '场景图 — 使用场景展示',
      spec: '规格参数图 — 关键规格与技术参数',
      compare: '对比图 — 竞品vs本产品',
      trust: '信任背书图 — 售后保障、认证、资质',
    };
    const slotNamesEn: Record<string, string> = {
      main_white: 'White Background Main Image — Pure Product Display',
      main_text: 'Main Image with Copy — Key Selling Points',
      feature: 'Feature Highlight — Core Function Close-up',
      scene: 'Scene Image — Usage Scenario',
      spec: 'Spec Sheet — Key Specifications',
      compare: 'Comparison — Competitor vs Product',
      trust: 'Trust Badge — After-sales, Certification',
    };

    if (isNonCN) {
      const slotName = slotNamesEn[input.slotType] || input.slotType;
      const lines = [`Slot Goal: ${slotName}`];
      if (input.slotPurpose) lines.push(`Goal: ${input.slotPurpose}`);
      if (input.keyMessages && input.keyMessages.length > 0) {
        lines.push(`Key Messages: ${input.keyMessages.join(', ')}`);
      }
      return lines.join('\n');
    }

    const slotName = slotNames[input.slotType] || input.slotType;
    const lines = [`图位目标：${slotName}`];
    if (input.slotPurpose) lines.push(`目标：${input.slotPurpose}`);
    if (input.keyMessages && input.keyMessages.length > 0) {
      lines.push(`卖点：${input.keyMessages.join('、')}`);
    }
    return lines.join('\n');
  }

  private buildOutputConstraint(rule: Record<string, unknown>, slotType: string, isNonCN: boolean = false): string {
    const r = rule as Record<string, unknown>;
    if (isNonCN) {
      return [
        `Output Constraints`,
        `Aspect Ratio: ${r.mainImageRatio}`,
        slotType === 'main_white'
          ? `Whitespace: 45%+, Product Occupancy: 85%+`
          : `Whitespace: 30%+, Product Occupancy: ${r.textAllowedOnMainImage ? '35-40%' : '20-25%'}`,
        `Negative List: Do NOT add: watermarks, fake logos, extra text, distortion, blur, noise`,
      ].join('\n');
    }
    return [
      `输出约束`,
      `比例：${r.mainImageRatio}`,
      slotType === 'main_white'
        ? `留白：45%+，产品占比：85%+`
        : `留白：30%+，产品占比：${r.textAllowedOnMainImage ? '35-40%' : '20-25%'}`,
      `否定清单：不要添加水印、虚假logo、多余文字、变形、模糊、噪点`,
    ].join('\n');
  }

  private postCompileCheck(text: string, sections: PromptSections, forbiddenWords: string[] = []): string[] {
    const warnings: string[] = [];
    const estimatedTokens = text.length * 0.6;
    if (estimatedTokens > 4000) warnings.push(`Prompt 预估 ${Math.round(estimatedTokens)} tokens，接近上限`);
    if (/\[.*?\]/.test(text)) warnings.push('Prompt 中可能包含未替换的占位符');
    const hexPattern = /#[0-9A-Fa-f]{6}/g;
    const hexMatches = text.match(hexPattern);
    if (hexMatches) {
      for (const hex of hexMatches) {
        if (hex.length !== 7) warnings.push(`颜色格式异常: ${hex}`);
      }
    }
    const negSection = sections.section7_outputConstraint;
    if (!negSection.includes('不要') && !negSection.includes('禁止') && !negSection.includes('否定') && !negSection.includes('Negative List')) {
      warnings.push('输出约束缺少否定清单');
    }

    if (forbiddenWords.length > 0) {
      const conflicts = forbiddenWords.filter(w => w && text.includes(w));
      if (conflicts.length > 0) {
        warnings.push(`禁用词冲突：Prompt 中包含平台禁止的词 "${conflicts.join('、')}"`);
      }
    }

    const s3 = sections.section3_platformConstraint;
    const s7 = sections.section7_outputConstraint;
    const s3NoText = /严格禁止.*文字|禁止文字/.test(s3);
    const s7HasText = /text|文字/.test(s7) && !/Do NOT/.test(s7);
    if (s3NoText && s7HasText) {
      warnings.push('段间指令冲突：段3禁止文字但段7提及文字限制');
    }

    return warnings;
  }
}
