import { prisma } from "@/lib/prisma";

export interface FeedbackRecord {
  id: string;
  workspaceId: string;
  exportPackId?: string | null;
  projectId?: string | null;
  platformId?: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  rating: number;
  source: string;
  notes: string;
  createdAt: Date;
}

export interface BatchImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface AggregatedStat {
  group: string;
  avgRating: number;
  totalFeedback: number;
  totalExports: number;
}

export class PerformanceFeedbackService {
  async recordFeedback(data: {
    workspaceId: string;
    exportPackId?: string;
    projectId?: string;
    platformId?: string;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    rating?: number;
    source?: string;
    notes?: string;
  }): Promise<FeedbackRecord> {
    const record = await prisma.performanceFeedback.create({
      data: {
        workspaceId: data.workspaceId,
        exportPackId: data.exportPackId ?? null,
        projectId: data.projectId ?? null,
        platformId: data.platformId ?? null,
        impressions: data.impressions ?? 0,
        clicks: data.clicks ?? 0,
        conversions: data.conversions ?? 0,
        rating: data.rating ?? 0,
        source: data.source ?? "manual",
        notes: data.notes ?? "",
      },
    });

    return record as unknown as FeedbackRecord;
  }

  async batchImportCsv(
    workspaceId: string,
    csvText: string,
  ): Promise<BatchImportResult> {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      return { success: 0, failed: 0, errors: ["CSV 数据为空或缺少数据行"] };
    }

    const header = lines[0].split(",").map((h) => h.trim());
    const requiredCols = ["exportPackId", "impressions", "clicks", "conversions", "rating"];
    const colIndex: Record<string, number> = {};
    for (const col of requiredCols) {
      const idx = header.indexOf(col);
      if (idx === -1) {
        return { success: 0, failed: 0, errors: [`缺少必需列: ${col}`] };
      }
      colIndex[col] = idx;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      try {
        const exportPackId = cols[colIndex["exportPackId"]] || null;
        const impressions = parseInt(cols[colIndex["impressions"]] || "0", 10);
        const clicks = parseInt(cols[colIndex["clicks"]] || "0", 10);
        const conversions = parseInt(cols[colIndex["conversions"]] || "0", 10);
        const rating = parseInt(cols[colIndex["rating"]] || "0", 10);

        await prisma.performanceFeedback.create({
          data: {
            workspaceId,
            exportPackId,
            impressions,
            clicks,
            conversions,
            rating,
            source: "csv",
          },
        });
        success++;
      } catch (e) {
        failed++;
        errors.push(`第 ${i + 1} 行: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return { success, failed, errors };
  }

  async getAggregatedStats(
    workspaceId: string,
    groupBy: "platform" | "category" | "brand",
  ): Promise<AggregatedStat[]> {
    const feedbacks = await prisma.performanceFeedback.findMany({
      where: { workspaceId },
    });

    const exportPackCount = await prisma.exportPack.count({
      where: { project: { workspaceId } },
    });

    if (feedbacks.length === 0) {
      return [];
    }

    const groupMap = new Map<
      string,
      { ratings: number[]; feedbackCount: number }
    >();

    for (const fb of feedbacks) {
      let groupKey = "unknown";

      if (groupBy === "platform") {
        groupKey = fb.platformId ?? "unknown";
      } else if (groupBy === "category") {
        if (fb.projectId) {
          const project = await prisma.project.findUnique({
            where: { id: fb.projectId },
            include: { generationTasks: { take: 1, include: { product: true } } },
          });
          if (project?.generationTasks[0]?.product?.category) {
            groupKey = project.generationTasks[0].product.category;
          }
        }
      } else if (groupBy === "brand") {
        if (fb.projectId) {
          const project = await prisma.project.findUnique({
            where: { id: fb.projectId },
            select: { clientSpaceId: true },
          });
          if (project?.clientSpaceId) {
            const clientSpace = await prisma.clientSpace.findUnique({
              where: { id: project.clientSpaceId },
              include: { brandPacks: { take: 1 } },
            });
            if (clientSpace?.brandPacks[0]?.brandName) {
              groupKey = clientSpace.brandPacks[0].brandName;
            }
          }
        }
      }

      const existing = groupMap.get(groupKey);
      if (existing) {
        existing.ratings.push(fb.rating);
        existing.feedbackCount++;
      } else {
        groupMap.set(groupKey, { ratings: [fb.rating], feedbackCount: 1 });
      }
    }

    const results: AggregatedStat[] = [];
    for (const [group, data] of groupMap) {
      const avgRating =
        Math.round(
          (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 100,
        ) / 100;
      results.push({
        group,
        avgRating,
        totalFeedback: data.feedbackCount,
        totalExports: exportPackCount,
      });
    }

    return results;
  }

  async getFeedbackByExportPack(exportPackId: string): Promise<FeedbackRecord[]> {
    const records = await prisma.performanceFeedback.findMany({
      where: { exportPackId },
      orderBy: { createdAt: "desc" },
    });

    return records as unknown as FeedbackRecord[];
  }
}
