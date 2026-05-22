import { prisma } from "@/lib/prisma";

export interface MainImageStrategy {
  id: string;
  slotTypeProportions: Record<string, number>;
  basis: string;
}

export interface SlotPriority {
  id: string;
  priorities: Array<{ slotType: string; avgGrade: number }>;
  basis: string;
}

const GRADE_MAP: Record<string, number> = {
  A: 95,
  B: 80,
  C: 65,
  D: 40,
  "N/A": 0,
};

export class StrategySuggestionEngine {
  async getMainImageStrategy(
    workspaceId: string,
    platformId: string,
    category: string,
  ): Promise<MainImageStrategy> {
    const feedbacks = await prisma.performanceFeedback.findMany({
      where: {
        workspaceId,
        platformId,
        rating: { gte: 4 },
      },
    });

    const highRatedProjectIds = new Set<string>();
    for (const fb of feedbacks) {
      if (fb.projectId) highRatedProjectIds.add(fb.projectId);
    }

    if (highRatedProjectIds.size === 0) {
      return this.fallbackMainImageStrategy(workspaceId, platformId, category);
    }

    const tasks = await prisma.generationTask.findMany({
      where: { projectId: { in: Array.from(highRatedProjectIds) } },
      include: { bundleSlot: true },
    });

    const mainSlots = tasks.filter(
      (t) => t.bundleSlot?.slotType?.startsWith("main_"),
    );

    if (mainSlots.length === 0) {
      return this.fallbackMainImageStrategy(workspaceId, platformId, category);
    }

    const typeCounts: Record<string, number> = {};
    for (const t of mainSlots) {
      const st = t.bundleSlot.slotType;
      typeCounts[st] = (typeCounts[st] || 0) + 1;
    }

    const total = mainSlots.length;
    const proportions: Record<string, number> = {};
    for (const [type, count] of Object.entries(typeCounts)) {
      proportions[type] = Math.round((count / total) * 100) / 100;
    }

    const basis = `基于 ${highRatedProjectIds.size} 个高评分项目的主图分布分析`;

    const record = await prisma.strategySuggestion.create({
      data: {
        workspaceId,
        platformId,
        category,
        suggestionType: "main_image_strategy",
        content: JSON.stringify({ slotTypeProportions: proportions }),
        basis,
      },
    });

    return {
      id: record.id,
      slotTypeProportions: proportions,
      basis,
    };
  }

  private async fallbackMainImageStrategy(
    workspaceId: string,
    platformId: string,
    category: string,
  ): Promise<MainImageStrategy> {
    const proportions = { main_white: 0.7, main_text: 0.2, main_scene: 0.1 };
    const basis = "基于平台规则，暂无历史数据优化";

    const record = await prisma.strategySuggestion.create({
      data: {
        workspaceId,
        platformId,
        category,
        suggestionType: "main_image_strategy",
        content: JSON.stringify({ slotTypeProportions: proportions }),
        basis,
      },
    });

    return { id: record.id, slotTypeProportions: proportions, basis };
  }

  async getSlotPriority(
    workspaceId: string,
    platformId: string,
    category: string,
  ): Promise<SlotPriority> {
    const platformRule = await prisma.platformRulePack.findUnique({
      where: { id: platformId },
    });
    if (!platformRule) {
      return this.fallbackSlotPriority(workspaceId, platformId, category);
    }

    const tasks = await prisma.generationTask.findMany({
      where: { platformPackId: platformRule.id },
      include: {
        qcResults: true,
        bundleSlot: true,
        product: true,
      },
    });

    let filtered = tasks;
    if (category) {
      filtered = tasks.filter((t) => t.product?.category === category);
    }

    const tasksWithQc = filtered.filter(
      (t) => t.qcResults.length > 0 && t.bundleSlot,
    );

    if (tasksWithQc.length === 0) {
      return this.fallbackSlotPriority(workspaceId, platformId, category);
    }

    const gradeBySlot: Record<string, number[]> = {};
    for (const t of tasksWithQc) {
      const slotType = t.bundleSlot.slotType;
      for (const qc of t.qcResults) {
        const grade = GRADE_MAP[qc.overallGrade] ?? 0;
        if (!gradeBySlot[slotType]) gradeBySlot[slotType] = [];
        gradeBySlot[slotType].push(grade);
      }
    }

    const priorities = Object.entries(gradeBySlot)
      .map(([slotType, grades]) => ({
        slotType,
        avgGrade:
          Math.round(
            (grades.reduce((a, b) => a + b, 0) / grades.length) * 100,
          ) / 100,
      }))
      .sort((a, b) => b.avgGrade - a.avgGrade);

    const basis = `基于 ${tasksWithQc.length} 个任务的质检结果排序`;

    const record = await prisma.strategySuggestion.create({
      data: {
        workspaceId,
        platformId,
        category,
        suggestionType: "slot_priority",
        content: JSON.stringify({ priorities }),
        basis,
      },
    });

    return { id: record.id, priorities, basis };
  }

  private async fallbackSlotPriority(
    workspaceId: string,
    platformId: string,
    category: string,
  ): Promise<SlotPriority> {
    const defaultOrder = [
      "main_white",
      "main_text",
      "scene",
      "feature",
      "spec",
      "compare",
      "trust",
    ];
    const priorities = defaultOrder.map((slotType, i) => ({
      slotType,
      avgGrade: (7 - i) * 10,
    }));
    const basis = "基于平台规则";

    const record = await prisma.strategySuggestion.create({
      data: {
        workspaceId,
        platformId,
        category,
        suggestionType: "slot_priority",
        content: JSON.stringify({ priorities }),
        basis,
      },
    });

    return { id: record.id, priorities, basis };
  }

  async adoptSuggestion(id: string) {
    return prisma.strategySuggestion.update({
      where: { id },
      data: { isAdopted: true },
    });
  }
}
