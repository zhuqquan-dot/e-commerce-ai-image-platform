import { prisma } from '@/lib/prisma';
import { QCGrade } from '@/types/enums';
import type { ComplianceRule } from '@/rules/compliance-rules';

interface QCInput {
  taskId: string;
  assetId: string;
  productId?: string;
  projectId?: string;
}

interface ComplianceCheckItem {
  name: string;
  passed: boolean | null;
  message: string;
}

interface QCScoreInternal {
  score: number;
  reasons: string[];
  suggestedAction: string;
}

interface QCResultData {
  consistencyScore: number;
  styleScore: number;
  complianceScore: number;
  overallGrade: QCGrade;
  reasons: string[];
  riskTags: string[];
  suggestedAction: string;
}

const CONSISTENCY_FIELDS = [
  'mainColor',
  'shapeType',
  'surfaceMaterial',
  'textureFeature',
  'edgeFeature',
  'accessoryCount',
] as const;

const STYLE_CATEGORIES = ['palette', 'background', 'lighting', 'brand'] as const;

export class QCEngine {
  async check(input: QCInput): Promise<QCResultData> {
    const task = await prisma.generationTask.findUnique({
      where: { id: input.taskId },
    });
    if (!task) throw new Error('Task not found');

    const rule = await prisma.platformRulePack.findUnique({
      where: { id: task.platformPackId },
    });
    if (!rule) throw new Error('Platform rule not found');

    const asset = await prisma.candidateAsset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new Error('Asset not found');

    const productId = input.productId || task.productId;
    const projectId = input.projectId || task.projectId;

    const compliance = this.checkCompliance(asset, rule, task.slotCode);
    const consistency = await this.checkConsistency(productId, input.taskId);
    const style = await this.checkStyle(projectId, input.taskId);

    const grade = this.determineGrade(
      consistency.score,
      style.score,
      compliance.score,
    );

    const reasons: string[] = [];
    compliance.reasons.forEach((r) => reasons.push(`[合规] ${r}`));
    consistency.reasons.forEach((r) => reasons.push(`[一致性] ${r}`));
    style.reasons.forEach((r) => reasons.push(`[风格] ${r}`));
    if (grade === QCGrade.C) reasons.push('[拦截] 平台合规严重不达标');

    const riskTags: string[] = [];
    if (compliance.score < 50) riskTags.push('合规高风险');
    if (grade === QCGrade.B) riskTags.push('需重生成');
    if (grade === QCGrade.C) riskTags.push('已拦截');

    const suggestedAction = this.getSuggestedAction(grade);

    await prisma.qcResult.create({
      data: {
        taskId: input.taskId,
        consistencyScore: consistency.score,
        styleScore: style.score,
        complianceScore: compliance.score,
        overallGrade: grade,
        reasons: JSON.stringify(reasons),
        riskTags: JSON.stringify(riskTags),
        suggestedAction,
        aiDetectionInputReserved: JSON.stringify({
          consistencyInput: { productId, taskId: input.taskId },
          styleInput: { projectId, taskId: input.taskId },
        }),
      },
    });

    return {
      consistencyScore: consistency.score,
      styleScore: style.score,
      complianceScore: compliance.score,
      overallGrade: grade,
      reasons,
      riskTags,
      suggestedAction,
    };
  }

  private checkCompliance(
    asset: Record<string, unknown>,
    rule: Record<string, unknown>,
    slotType: string,
  ): QCScoreInternal {
    const checkItems: ComplianceCheckItem[] = [];
    const reasons: string[] = [];

    const [expectedW, expectedH] = (
      (rule.mainImageSize as string) || '800x800'
    )
      .split('x')
      .map(Number);
    const assetW = asset.width as number;
    const assetH = asset.height as number;
    if (assetW > 0 && assetH > 0) {
      const passed = assetW >= expectedW * 0.8 && assetH >= expectedH * 0.8;
      checkItems.push({
        name: '尺寸检查',
        passed,
        message: passed
          ? `尺寸合格: ${assetW}x${assetH}`
          : `尺寸不足: ${assetW}x${assetH}，要求≥${expectedW}x${expectedH}`,
      });
      if (!passed) reasons.push(checkItems[checkItems.length - 1].message);
    } else {
      checkItems.push({
        name: '尺寸检查',
        passed: null,
        message: '尺寸信息缺失，需人工审核',
      });
    }

    const allowedFormats = JSON.parse(
      (rule.allowedFormats as string) || '[]',
    ) as string[];
    const format = ((asset.format as string) || 'JPG').toUpperCase();
    const formatPassed = allowedFormats.some((f: string) =>
      format.includes(f.toUpperCase()),
    );
    checkItems.push({
      name: '格式检查',
      passed: formatPassed,
      message: formatPassed
        ? `格式合格: ${format}`
        : `格式错误: ${format}，允许: ${allowedFormats.join('/')}`,
    });
    if (!formatPassed) reasons.push(checkItems[checkItems.length - 1].message);

    const fileSizeBytes = asset.fileSizeBytes as number;
    if (fileSizeBytes > 0) {
      const maxBytes =
        ((rule.maxFileSizeMb as number) || 3) * 1024 * 1024;
      const sizePassed = fileSizeBytes <= maxBytes;
      checkItems.push({
        name: '文件大小检查',
        passed: sizePassed,
        message: sizePassed
          ? `文件大小合格: ${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB`
          : `文件过大: ${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB，限制${rule.maxFileSizeMb}MB`,
      });
      if (!sizePassed) reasons.push(checkItems[checkItems.length - 1].message);
    } else {
      checkItems.push({
        name: '文件大小检查',
        passed: null,
        message: '文件大小信息缺失，需人工审核',
      });
    }

    const isMainWhite = slotType === 'main_white';
    const whiteBgRequired = rule.whiteBackgroundRequired as boolean;
    checkItems.push({
      name: '白底检查',
      passed: null,
      message: `需人工审核: RGB(${rule.whiteBackgroundToleranceR ?? 255},${rule.whiteBackgroundToleranceG ?? 255},${rule.whiteBackgroundToleranceB ?? 255}) 纯白背景检查`,
    });
    if (isMainWhite && whiteBgRequired) {
      reasons.push(
        `[需图片分析] 白底要求: RGB(${rule.whiteBackgroundToleranceR ?? 255},${rule.whiteBackgroundToleranceG ?? 255},${rule.whiteBackgroundToleranceB ?? 255}) 纯白背景检查`,
      );
    }

    checkItems.push({
      name: '文字检查',
      passed: null,
      message: '需人工审核: 主图文字/水印/Logo 检查',
    });
    if (isMainWhite && !rule.textAllowedOnMainImage) {
      reasons.push('[需图片分析] 主图禁止文字/水印 检查');
    }

    checkItems.push({
      name: '水印检查',
      passed: null,
      message: '需人工审核: 水印检查',
    });
    if (!rule.watermarkAllowed) {
      reasons.push('[需图片分析] 禁止水印检查');
    }

    checkItems.push({
      name: 'Logo检查',
      passed: null,
      message: '需人工审核: Logo检查',
    });
    if (!rule.logoAllowed) {
      reasons.push('[需图片分析] 禁止Logo检查');
    }

    checkItems.push({
      name: '边框检查',
      passed: null,
      message: '需人工审核: 边框检查',
    });
    if (!rule.borderAllowed) {
      reasons.push('[需图片分析] 禁止边框检查');
    }

    const hardItems = checkItems.filter((c) =>
      ['尺寸检查', '格式检查', '文件大小检查'].includes(c.name),
    );
    const softItems = checkItems.filter((c) =>
      ['白底检查', '文字检查', '水印检查', 'Logo检查', '边框检查'].includes(c.name),
    );

    const hardPassed = hardItems.filter((c) => c.passed === true).length;
    const hardTotal = hardItems.filter((c) => c.passed !== null).length;
    const hardScore = hardTotal > 0 ? (hardPassed / hardTotal) * 60 : 60;

    const softCounted = softItems.filter((c) => c.passed !== null);
    const softPassed = softCounted.filter((c) => c.passed === true).length;
    const softTotal = softCounted.length;
    const softScore = softTotal > 0 ? (softPassed / softTotal) * 40 : 0;

    const score = Math.round(hardScore + softScore);

    return { score, reasons, suggestedAction: 'review' };
  }

  checkWithComplianceRule(
    asset: {
      width: number;
      height: number;
      format: string;
      fileSizeBytes: number;
    },
    rule: ComplianceRule,
  ): string[] {
    const issues: string[] = [];

    if (rule.whiteBg.required) {
      const { rMin, gMin, bMin } = rule.whiteBg.tolerance;
      issues.push(
        `[合规] 白底要求：纯白背景 RGB(255,255,255)；tolerance(R>=${rMin},G>=${gMin},B>=${bMin})【需图片分析】`,
      );
    }

    if (!rule.text.allowed) {
      issues.push(
        '[合规] 文字禁止：主图不允许任何文字、水印、边框、Logo',
      );
    } else if (rule.text.maxChars > 0) {
      issues.push(
        `[合规] 文字限制：最多${rule.text.maxLines}行${rule.text.maxChars}字【需图片分析】`,
      );
    }

    if (rule.forbiddenElements.length > 0) {
      issues.push(
        `[合规] 禁止元素：${rule.forbiddenElements.join('、')}【需图片分析】`,
      );
    }

    if (rule.priceOverlayZone) {
      issues.push(
        `[合规] 价格叠加区：避让${rule.priceOverlayZone.description}`,
      );
    }

    if (rule.absoluteTermsForbidden) {
      issues.push('[合规] 禁止绝对化用语');
    }

    return issues;
  }

  private async checkConsistency(
    productId: string,
    taskId: string,
  ): Promise<QCScoreInternal> {
    const reasons: string[] = [];

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return {
        score: 0,
        reasons: ['[错误] 商品不存在，无法执行一致性检测'],
        suggestedAction: 'block',
      };
    }

    let checkedCount = 0;
    let totalRequired = CONSISTENCY_FIELDS.length;

    for (const field of CONSISTENCY_FIELDS) {
      const value = product[field] as string;
      if (value && value.trim() !== '') {
        checkedCount++;
        reasons.push(
          `[rule] ${field}: 真值已记录 \"${value.substring(0, 40)}${value.length > 40 ? '...' : ''}\"`,
        );
      } else {
        reasons.push(
          `[skip] ${field}: 真值包字段缺失，跳过检查`,
        );
      }
    }

    const mustNotChange = JSON.parse(
      product.mustNotChangeFeatures || '[]',
    ) as string[];
    const mustNotDisappear = JSON.parse(
      product.mustNotDisappearFeatures || '[]',
    ) as string[];
    const mustNotAdd = JSON.parse(
      product.mustNotAddFeatures || '[]',
    ) as string[];

    for (const feature of mustNotChange) {
      reasons.push(
        `[rule] mustNotChangeFeatures.${feature}: 该特征不可变更`,
      );
    }
    for (const feature of mustNotDisappear) {
      reasons.push(
        `[rule] mustNotDisappearFeatures.${feature}: 该特征不可消失`,
      );
    }
    for (const feature of mustNotAdd) {
      reasons.push(
        `[rule] mustNotAddFeatures.${feature}: 禁止新增该特征`,
      );
    }

    const baseScore =
      totalRequired > 0
        ? Math.round((checkedCount / totalRequired) * 100)
        : 100;

    const constraintBonus = Math.min(
      (mustNotChange.length + mustNotDisappear.length + mustNotAdd.length) * 5,
      15,
    );

    const score = Math.min(100, baseScore + constraintBonus);

    return {
      score,
      reasons: [
        `[一致性检测] 已检查 ${checkedCount}/${totalRequired} 个真值字段，${mustNotChange.length + mustNotDisappear.length + mustNotAdd.length} 条约束`,
        ...reasons,
      ],
      suggestedAction: 'review',
    };
  }

  private async checkStyle(
    projectId: string,
    taskId: string,
  ): Promise<QCScoreInternal> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return {
        score: 60,
        reasons: ['[错误] 项目不存在，基于默认保守标准评估'],
        suggestedAction: 'review',
      };
    }

    if (!project.seriesPackId) {
      return {
        score: 60,
        reasons: ['样式锁未配置：基于默认保守标准评估'],
        suggestedAction: 'review',
      };
    }

    const seriesPack = await prisma.seriesPack.findUnique({
      where: { id: project.seriesPackId },
      include: { brandPack: true },
    });
    if (!seriesPack) {
      return {
        score: 60,
        reasons: ['[错误] 样式锁记录不存在，基于默认保守标准评估'],
        suggestedAction: 'review',
      };
    }

    const reasons: string[] = [];
    let configuredCount = 0;

    if (
      seriesPack.fixedPalette &&
      JSON.parse(seriesPack.fixedPalette).length > 0
    ) {
      configuredCount++;
      reasons.push(
        `[rule] 色板约束已配置: ${seriesPack.fixedPalette}`,
      );
    } else {
      reasons.push('[skip] 色板约束未配置');
    }

    if (seriesPack.backgroundSystem && seriesPack.backgroundSystem.trim() !== '') {
      configuredCount++;
      reasons.push(
        `[rule] 背景约束已配置: ${seriesPack.backgroundSystem}`,
      );
    } else {
      reasons.push('[skip] 背景约束未配置');
    }

    if (seriesPack.lightingSystem && seriesPack.lightingSystem.trim() !== '') {
      configuredCount++;
      reasons.push(
        `[rule] 光照约束已配置: ${seriesPack.lightingSystem}`,
      );
    } else {
      reasons.push('[skip] 光照约束未配置');
    }

    const brandPack = seriesPack.brandPack;
    if (brandPack) {
      const brandFieldCount = [
        brandPack.brandPrimaryColor,
        brandPack.brandSecondaryColor,
        brandPack.brandTone,
        brandPack.brandVisualBoundary,
      ].filter((v) => v && v.trim() !== '').length;

      if (brandFieldCount >= 2) {
        configuredCount++;
        reasons.push(
          `[rule] 品牌语气边界已配置: primary=${brandPack.brandPrimaryColor || '-'}, tone=${brandPack.brandTone || '-'}`,
        );
      } else {
        reasons.push('[skip] 品牌约束不足（需≥2项），使用默认保守标准');
      }
    } else {
      reasons.push('[skip] 品牌包未关联');
    }

    const score = Math.round((configuredCount / STYLE_CATEGORIES.length) * 100);

    return {
      score,
      reasons: [
        `[风格检测] 已配置 ${configuredCount}/${STYLE_CATEGORIES.length} 个样式类别`,
        ...reasons,
      ],
      suggestedAction: 'review',
    };
  }

  private determineGrade(
    consistencyScore: number,
    styleScore: number,
    complianceScore: number,
  ): QCGrade {
    if (complianceScore < 30) return QCGrade.C;
    if (
      consistencyScore >= 90 &&
      styleScore >= 90 &&
      complianceScore >= 95
    ) {
      return QCGrade.S;
    }
    const totalScore =
      (consistencyScore + styleScore + complianceScore) / 3;
    if (totalScore >= 80) return QCGrade.A;
    if (totalScore >= 60) return QCGrade.B;
    return QCGrade.C;
  }

  private getSuggestedAction(grade: QCGrade): string {
    switch (grade) {
      case QCGrade.S:
        return 'fast_track';
      case QCGrade.A:
        return 'review';
      case QCGrade.B:
        return 'regenerate';
      case QCGrade.C:
        return 'block';
    }
  }
}
