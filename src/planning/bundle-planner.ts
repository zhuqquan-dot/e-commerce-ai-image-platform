import { SlotType } from '@/types/enums';
import { prisma } from '@/lib/prisma';
import { slotMappingRegistry } from './slot-mapping-registry';

interface SlotPlanInput {
  slotType: SlotType;
  isAnchor: boolean;
  isRequired: boolean;
  sequenceOrder: number;
  exportNameSuggestion: string;
  ruleRefs: string[];
  warnings: string[];
  maxCount: number;
  minCount: number;
}

interface BundlePlanOutput {
  platform: string;
  slots: SlotPlanInput[];
}

const SLOT_LABELS: Record<string, string> = {
  main_white: '1-首图白底',
  main_text: '1-首图',
  feature: '2-功能卖点',
  scene: '3-场景图',
  spec: '4-规格图',
  compare: '5-对比图',
  trust: '6-信任背书图',
};

export class BundlePlanner {
  async plan(projectId: string): Promise<BundlePlanOutput[]> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    let selectedPlatforms: string[];
    try {
      selectedPlatforms = JSON.parse(project.selectedPlatforms);
    } catch {
      throw new Error(`Invalid selectedPlatforms JSON on project ${projectId}`);
    }

    if (!Array.isArray(selectedPlatforms) || selectedPlatforms.length === 0) {
      throw new Error('Project has no platforms selected');
    }

    const product = await prisma.product.findUnique({
      where: { id: project.productId },
    });

    if (!product) {
      throw new Error(`Product not found: ${project.productId}`);
    }

    await this.deleteExistingPlans(projectId);

    const results: BundlePlanOutput[] = [];

    for (const platform of selectedPlatforms) {
      const mappings = slotMappingRegistry.getMapping(platform);

      if (mappings.length === 0) {
        throw new Error(`No slot mappings for platform: ${platform}`);
      }

      const rulePack = await prisma.platformRulePack.findUnique({
        where: { platformName: platform },
      });

      if (!rulePack) {
        throw new Error(`Platform rule pack not found for: ${platform}`);
      }

      const rulePackData = rulePack as Record<string, unknown>;

      const slotPlans: SlotPlanInput[] = [];

      let nonAnchorIndex = 0;

      for (const mapping of mappings) {
        const slotType = mapping.unifiedSlotType as SlotType;

        const isAnchor = mapping.unifiedSlotType === 'main_white';

        const maxCount = 1;
        const minCount = mapping.isRequired ? 1 : 0;

        const slotWarnings: string[] = [];

        if (
          mapping.unifiedSlotType === 'main_white' &&
          rulePackData.whiteBackgroundRequired === true
        ) {
          slotWarnings.push('必须纯白背景 RGB(255,255,255)');
        }

        if (
          mapping.unifiedSlotType === 'main_white' &&
          rulePackData.textAllowedOnMainImage === false
        ) {
          slotWarnings.push('首图禁止叠加任何文字/Logo/水印');
        }

        if (mapping.unifiedSlotType === 'main_white' || mapping.unifiedSlotType === 'main_text') {
          slotWarnings.push(
            `要求尺寸 ${rulePackData.mainImageSize || '800x800'}，比例 ${rulePackData.mainImageRatio || '1:1'}`,
          );
        }

        slotWarnings.push(
          `仅支持格式: ${this.parseJsonArray(rulePackData.allowedFormats).join(', ')}`,
        );
        slotWarnings.push(
          `文件大小 ≤ ${rulePackData.maxFileSizeMb || 2}MB`,
        );

        if (mapping.unifiedSlotType === 'main_white' && !product.mainColor) {
          slotWarnings.push(`平台 ${platform} 要求主色但商品缺失`);
        }

        if (!product.frontRefImage) {
          slotWarnings.push(`平台 ${platform} 建议参考图但商品缺失`);
        }

        const isMainSlot = mapping.unifiedSlotType === 'main_white' || mapping.unifiedSlotType === 'main_text';
        const exportIndex = isMainSlot ? 1 : nonAnchorIndex + 1;
        if (!isMainSlot) nonAnchorIndex++;

        const exportName = this.generateExportName(
          product.productName,
          platform,
          slotType,
          exportIndex,
        );

        const ruleRefs = this.buildRuleRefs(mapping.unifiedSlotType, platform, rulePackData);

        slotPlans.push({
          slotType,
          isAnchor,
          isRequired: mapping.isRequired,
          sequenceOrder: 0,
          exportNameSuggestion: exportName,
          ruleRefs,
          warnings: slotWarnings,
          maxCount,
          minCount,
        });
      }

      const mainWhiteFound = slotPlans.some((s) => s.slotType === SlotType.MAIN_WHITE);
      if (!mainWhiteFound) {
        const firstRequired = slotPlans.find((s) => s.isRequired);
        if (firstRequired) {
          firstRequired.isAnchor = true;
        }
      }

      const anchors = slotPlans.filter((s) => s.isAnchor);
      const nonAnchors = slotPlans.filter((s) => !s.isAnchor);

      const finalSequence = [
        ...anchors.map((s, i) => ({ ...s, sequenceOrder: i })),
        ...nonAnchors.map((s, i) => ({ ...s, sequenceOrder: anchors.length + i })),
      ];

      const bundlePlan = await prisma.bundlePlan.create({
        data: {
          projectId,
          platform,
          status: 'planned',
          bundleSlots: {
            create: finalSequence.map((slot) => ({
              slotType: slot.slotType,
              isAnchor: slot.isAnchor,
              isRequired: slot.isRequired,
              sequenceOrder: slot.sequenceOrder,
              exportNameSuggestion: slot.exportNameSuggestion,
              ruleRefs: JSON.stringify(slot.ruleRefs),
              warnings: JSON.stringify(slot.warnings),
            })),
          },
        },
        include: { bundleSlots: true },
      });

      results.push({
        platform,
        slots: bundlePlan.bundleSlots.map((s) => ({
          slotType: s.slotType as SlotType,
          isAnchor: s.isAnchor,
          isRequired: s.isRequired,
          sequenceOrder: s.sequenceOrder,
          exportNameSuggestion: s.exportNameSuggestion,
          ruleRefs: this.parseJsonArray(s.ruleRefs),
          warnings: this.parseJsonArray(s.warnings),
          maxCount: this.resolveMaxCount(platform, s.slotType as SlotType),
          minCount: s.isRequired ? 1 : 0,
        })),
      });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'planned' },
    });

    return results;
  }

  async getPlan(projectId: string): Promise<BundlePlanOutput[]> {
    const bundlePlans = await prisma.bundlePlan.findMany({
      where: { projectId },
      include: { bundleSlots: { orderBy: { sequenceOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });

    return bundlePlans.map((plan) => ({
      platform: plan.platform,
      slots: plan.bundleSlots.map((s) => ({
        slotType: s.slotType as SlotType,
        isAnchor: s.isAnchor,
        isRequired: s.isRequired,
        sequenceOrder: s.sequenceOrder,
        exportNameSuggestion: s.exportNameSuggestion,
        ruleRefs: this.parseJsonArray(s.ruleRefs),
        warnings: this.parseJsonArray(s.warnings),
        maxCount: this.resolveMaxCount(plan.platform, s.slotType as SlotType),
        minCount: s.isRequired ? 1 : 0,
      })),
    }));
  }

  private async deleteExistingPlans(projectId: string): Promise<void> {
    const existingPlans = await prisma.bundlePlan.findMany({
      where: { projectId },
      select: { id: true },
    });

    for (const plan of existingPlans) {
      await prisma.bundlePlan.delete({ where: { id: plan.id } });
    }
  }

  private resolveMaxCount(_platform: string, _slotType: SlotType): number {
    return 1;
  }

  private mapToSlotType(platformSlotName: string): SlotType {
    const validTypes = Object.values(SlotType) as string[];
    if (validTypes.includes(platformSlotName)) {
      return platformSlotName as SlotType;
    }

    const fallbackMap: Record<string, SlotType> = {
      MAIN: SlotType.MAIN_WHITE,
      PT1: SlotType.FEATURE,
      PT2: SlotType.SCENE,
      H1: SlotType.MAIN_TEXT,
      H2: SlotType.FEATURE,
      H3: SlotType.SCENE,
      image1: SlotType.MAIN_WHITE,
      image2: SlotType.FEATURE,
      image3: SlotType.SCENE,
    };

    const normalized = platformSlotName.toUpperCase().trim();
    if (fallbackMap[normalized]) {
      return fallbackMap[normalized];
    }

    return SlotType.FEATURE;
  }

  private generateExportName(
    productName: string,
    platform: string,
    slotType: SlotType,
    index: number,
  ): string {
    const safeName = productName
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 40);

    const platformShort: Record<string, string> = {
      TAOBAO_TMALL: 'TB',
      JD: 'JD',
      PINDUODUO: 'PDD',
      DOUYIN: 'DY',
      AMAZON: 'AMZ',
      EBAY: 'EBAY',
      ETSY: 'ETSY',
      SHOPIFY: 'SHOP',
      TIKTOK_SHOP: 'TT',
      ALIEXPRESS: 'ALI',
    };

    const short = platformShort[platform] || platform.substring(0, 4).toUpperCase();
    const label = SLOT_LABELS[slotType] || slotType;
    const slotShort = label.replace(/^\d+-/, '');

    return `${safeName}_${short}_${slotShort}_${String(index).padStart(2, '0')}.jpg`;
  }

  private buildRuleRefs(
    slotName: string,
    platform: string,
    rulePack: Record<string, unknown>,
  ): string[] {
    const refs: string[] = [
      `platformRulePack:${platform}`,
      `slot:${slotName}`,
    ];

    if (slotName === 'main_white') {
      refs.push('rule:whiteBackgroundRequired');
      refs.push('rule:mainImageRatio');
      refs.push('rule:mainImageSize');
      refs.push('rule:textAllowedOnMainImage');
      refs.push('rule:watermarkAllowed');
      refs.push('rule:logoAllowed');
      refs.push('rule:borderAllowed');
    }

    if (slotName === 'main_text') {
      refs.push('rule:mainImageRatio');
      refs.push('rule:mainImageSize');
      refs.push('rule:maxOverlayTextLength');
    }

    refs.push('rule:allowedFormats');
    refs.push('rule:maxFileSizeMb');

    if (rulePack.forbiddenWords) {
      refs.push('rule:forbiddenWords');
    }

    return refs;
  }

  private parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
