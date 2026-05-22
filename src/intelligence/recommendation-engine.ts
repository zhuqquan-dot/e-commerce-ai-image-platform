import { prisma } from "@/lib/prisma";

export interface BundleRecommendation {
  id: string;
  slotTypes: string[];
  frequency: number;
  passRate: number;
  basis: string;
}

export class RecommendationEngine {
  async getBundleRecommendations(
    workspaceId: string,
    platformId?: string,
    category?: string,
    brandId?: string,
  ): Promise<BundleRecommendation[]> {
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        status: { in: ["exported", "export_ready"] },
      },
      include: {
        bundlePlans: {
          include: {
            bundleSlots: true,
          },
        },
        generationTasks: {
          include: {
            reviewRecords: true,
          },
        },
      },
    });

    let filtered = projects;

    if (platformId) {
      const platformRule = await prisma.platformRulePack.findUnique({
        where: { id: platformId },
      });
      if (platformRule) {
        filtered = filtered.filter((p) =>
          p.bundlePlans.some((bp) => bp.platform === platformRule.platformName),
        );
      }
    }

    if (category) {
      const productIds = filtered.map((p) => p.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productCategoryMap = new Map(products.map((p) => [p.id, p.category]));
      filtered = filtered.filter(
        (p) => productCategoryMap.get(p.productId) === category,
      );
    }

    if (brandId) {
      const productIds = filtered.map((p) => p.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productBrandMap = new Map(products.map((p) => [p.id, p.brandPackId]));
      filtered = filtered.filter(
        (p) => productBrandMap.get(p.productId) === brandId,
      );
    }

    if (filtered.length === 0) {
      return this.fallbackRecommendations(workspaceId, platformId);
    }

    const comboMap = new Map<string, { projectIds: Set<string>; taskIds: string[] }>();

    for (const project of filtered) {
      for (const plan of project.bundlePlans) {
        const slotTypes = plan.bundleSlots
          .map((s) => s.slotType)
          .sort();
        if (slotTypes.length === 0) continue;

        const key = slotTypes.join(",");
        const existing = comboMap.get(key);
        if (existing) {
          existing.projectIds.add(project.id);
          existing.taskIds.push(
            ...project.generationTasks.map((t) => t.id),
          );
        } else {
          comboMap.set(key, {
            projectIds: new Set([project.id]),
            taskIds: project.generationTasks.map((t) => t.id),
          });
        }
      }
    }

    const combos = Array.from(comboMap.entries()).map(([key, data]) => {
      const totalReviews = data.taskIds.length;
      let approveCount = 0;
      for (const project of filtered) {
        if (!data.projectIds.has(project.id)) continue;
        for (const task of project.generationTasks) {
          if (data.taskIds.includes(task.id)) {
            approveCount += task.reviewRecords.filter(
              (r) => r.action === "approve" || r.action === "approved",
            ).length;
          }
        }
      }
      const passRate = totalReviews > 0 ? approveCount / totalReviews : 0;

      return {
        slotTypes: key.split(","),
        frequency: data.projectIds.size,
        passRate: Math.round(passRate * 100) / 100,
      };
    });

    combos.sort((a, b) => b.frequency - a.frequency);
    const top3 = combos.slice(0, 3);

    const totalProjects = filtered.length;
    const results: BundleRecommendation[] = [];

    for (const combo of top3) {
      const pct = Math.round((combo.frequency / totalProjects) * 100);
      const passPct = Math.round(combo.passRate * 100);
      const basis = `历史项目中 ${pct}% 使用此图位组合，平均审核通过率 ${passPct}%`;

      const record = await prisma.recommendation.create({
        data: {
          workspaceId,
          type: "bundle",
          context: JSON.stringify({ platformId, category, brandId }),
          content: JSON.stringify({ slotTypes: combo.slotTypes }),
          basis,
        },
      });

      results.push({
        id: record.id,
        slotTypes: combo.slotTypes,
        frequency: combo.frequency,
        passRate: combo.passRate,
        basis,
      });
    }

    return results;
  }

  private async fallbackRecommendations(
    workspaceId: string,
    platformId?: string,
  ): Promise<BundleRecommendation[]> {
    let slotTypes: string[] = [];

    if (platformId) {
      const platform = await prisma.platformRulePack.findUnique({
        where: { id: platformId },
      });
      if (platform) {
        try {
          slotTypes = JSON.parse(platform.supportedSlots);
        } catch {
          slotTypes = [];
        }
      }
    }

    if (slotTypes.length === 0) {
      slotTypes = ["main_white", "main_text", "scene", "feature", "spec"];
    }

    const record = await prisma.recommendation.create({
      data: {
        workspaceId,
        type: "bundle",
        context: JSON.stringify({ platformId }),
        content: JSON.stringify({ slotTypes }),
        basis: "基于平台规则推荐",
      },
    });

    return [
      {
        id: record.id,
        slotTypes,
        frequency: 0,
        passRate: 0,
        basis: "基于平台规则推荐",
      },
    ];
  }

  async adoptRecommendation(id: string) {
    return prisma.recommendation.update({
      where: { id },
      data: { isAdopted: true, adoptedAt: new Date() },
    });
  }
}
