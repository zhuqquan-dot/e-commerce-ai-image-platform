import { prisma } from "@/lib/prisma";

export interface SlotOptimization {
  id: string;
  taskId: string;
  slotType: string;
  currentScore: number;
  suggestions: string[];
  priority: "high" | "medium";
}

export interface BundleGapSuggestion {
  id: string;
  missingSlotType: string;
  suggestion: string;
}

export interface RetryPriorityItem {
  id: string;
  taskId: string;
  slotType: string;
  score: number;
  weight: number;
}

const SLOT_WEIGHT: Record<string, number> = {
  main_white: 10,
  main_text: 9,
  scene: 7,
  feature: 6,
  spec: 4,
  compare: 3,
  trust: 2,
};

function getSlotWeight(slotType: string): number {
  if (SLOT_WEIGHT[slotType]) return SLOT_WEIGHT[slotType];
  if (slotType.startsWith("main_")) return 8;
  return 1;
}

export class OptimizationAssistant {
  async getSlotOptimizations(projectId: string): Promise<SlotOptimization[]> {
    const tasks = await prisma.generationTask.findMany({
      where: { projectId },
      include: {
        qcResults: true,
        bundleSlot: true,
      },
    });

    const lowScoreTasks = tasks.filter((t) => {
      if (t.qcResults.length === 0) return false;
      const latestQc = t.qcResults[t.qcResults.length - 1];
      return latestQc.overallGrade === "D" || latestQc.consistencyScore < 60;
    });

    const results: SlotOptimization[] = [];

    for (const task of lowScoreTasks) {
      const latestQc = task.qcResults[task.qcResults.length - 1];
      const score = latestQc.consistencyScore;
      const slotType = task.bundleSlot?.slotType ?? task.slotCode;

      const suggestions: string[] = [];
      if (score < 40) {
        suggestions.push("增加商品细节参考图");
        suggestions.push("在 Prompt 中强调高清细节");
        suggestions.push("尝试更换 Provider");
      } else {
        suggestions.push("在 Prompt 中强调高清细节");
        suggestions.push("尝试更换 Provider");
      }

      const priority: "high" | "medium" = score < 40 ? "high" : "medium";

      const record = await prisma.optimizationSuggestion.create({
        data: {
          workspaceId: (await prisma.project.findUnique({
            where: { id: projectId },
            select: { workspaceId: true },
          }))!.workspaceId,
          projectId,
          taskId: task.id,
          suggestionType: "slot_optimization",
          content: JSON.stringify({ slotType, currentScore: score, suggestions }),
          priority,
        },
      });

      results.push({
        id: record.id,
        taskId: task.id,
        slotType,
        currentScore: score,
        suggestions,
        priority,
      });
    }

    return results;
  }

  async getBundleGapSuggestions(projectId: string): Promise<BundleGapSuggestion[]> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        bundlePlans: {
          include: { bundleSlots: true },
        },
      },
    });

    if (!project || project.bundlePlans.length === 0) return [];

    const existingSlotTypes = new Set<string>();
    for (const plan of project.bundlePlans) {
      for (const slot of plan.bundleSlots) {
        existingSlotTypes.add(slot.slotType);
      }
    }

    const platformId = project.bundlePlans[0].platform;
    const platformRule = await prisma.platformRulePack.findFirst({
      where: { platformName: platformId },
    });

    if (!platformRule) return [];

    let supportedSlots: string[] = [];
    try {
      supportedSlots = JSON.parse(platformRule.supportedSlots);
    } catch {
      return [];
    }

    const missing = supportedSlots.filter((s) => !existingSlotTypes.has(s));
    const results: BundleGapSuggestion[] = [];

    for (const slotType of missing) {
      const record = await prisma.optimizationSuggestion.create({
        data: {
          workspaceId: project.workspaceId,
          projectId,
          suggestionType: "bundle_gap",
          content: JSON.stringify({ missingSlotType: slotType }),
          priority: "medium",
        },
      });

      results.push({
        id: record.id,
        missingSlotType: slotType,
        suggestion: `当前图包缺少 ${slotType} 图位，建议添加`,
      });
    }

    return results;
  }

  async getRetryPriority(projectId: string): Promise<RetryPriorityItem[]> {
    const tasks = await prisma.generationTask.findMany({
      where: {
        projectId,
        OR: [
          { status: "qc_failed" },
        ],
      },
      include: {
        qcResults: true,
        bundleSlot: true,
      },
    });

    const alsoLowGrade = await prisma.generationTask.findMany({
      where: { projectId },
      include: {
        qcResults: true,
        bundleSlot: true,
      },
    });

    const allCandidates = new Map<string, typeof tasks[0]>();

    for (const t of tasks) {
      allCandidates.set(t.id, t);
    }

    for (const t of alsoLowGrade) {
      if (t.qcResults.length === 0) continue;
      const latestQc = t.qcResults[t.qcResults.length - 1];
      if (latestQc.overallGrade === "D" || latestQc.overallGrade === "N/A") {
        allCandidates.set(t.id, t);
      }
    }

    const candidates = Array.from(allCandidates.values());

    const items: Array<{ taskId: string; slotType: string; score: number; weight: number }> = [];

    for (const t of candidates) {
      const slotType = t.bundleSlot?.slotType ?? t.slotCode;
      const weight = getSlotWeight(slotType);
      let score = 0;
      if (t.qcResults.length > 0) {
        score = t.qcResults[t.qcResults.length - 1].consistencyScore;
      }

      items.push({ taskId: t.id, slotType, score, weight });
    }

    items.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.score - b.score;
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!project) return [];

    const results: RetryPriorityItem[] = [];

    for (const item of items) {
      const record = await prisma.optimizationSuggestion.create({
        data: {
          workspaceId: project.workspaceId,
          projectId,
          taskId: item.taskId,
          suggestionType: "retry_priority",
          content: JSON.stringify(item),
          priority: item.score < 40 ? "high" : "medium",
        },
      });

      results.push({
        id: record.id,
        taskId: item.taskId,
        slotType: item.slotType,
        score: item.score,
        weight: item.weight,
      });
    }

    return results;
  }

  async getComplianceSuggestions(projectId: string) {
    const tasks = await prisma.generationTask.findMany({
      where: { projectId },
      include: { qcResult: true },
    });

    const lowConsistency = tasks.filter(
      (t) => t.qcResult && t.qcResult.consistencyScore < 60
    );

    if (lowConsistency.length === 0) return [];

    const suggestion = await prisma.optimizationSuggestion.create({
      data: {
        workspaceId: lowConsistency[0].projectId,
        projectId,
        suggestionType: "compliance",
        content: JSON.stringify({
          consistencyScore: lowConsistency.reduce(
            (sum, t) => sum + (t.qcResult?.consistencyScore ?? 0),
            0
          ) / lowConsistency.length,
          affectedSlots: lowConsistency.map((t) => t.slotType),
          suggestions: [
            "检查品牌包颜色配置是否与生成图一致",
            "确认品牌包语调与商品描述匹配",
            "考虑更新品牌包视觉边界参数",
          ],
        }),
        priority: "medium",
      },
    });

    return [suggestion];
  }

  async adoptSuggestion(id: string) {
    return prisma.optimizationSuggestion.update({
      where: { id },
      data: { isAdopted: true, adoptedAt: new Date() },
    });
  }
}
