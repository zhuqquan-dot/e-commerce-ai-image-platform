import { prisma } from '@/lib/prisma';
import { BundlePlanner } from './bundle-planner';

export interface BatchPlanSubProject {
  projectId: string;
  status: 'succeeded' | 'failed';
  reason?: string;
  planId?: string;
  slotCount?: number;
  platforms?: string[];
}

export interface BatchPlanResult {
  parentProjectId: string;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    totalSlots: number;
    anchorSlots: number;
  };
  warnings: Array<{ type: string; count: number }>;
  subProjects: BatchPlanSubProject[];
}

export class BatchBundlePlanner {
  async planBatch(parentProjectId: string): Promise<BatchPlanResult> {
    const subProjects = await prisma.project.findMany({
      where: { parentProjectId },
    });

    if (subProjects.length === 0) {
      return {
        parentProjectId,
        summary: { total: 0, succeeded: 0, failed: 0, totalSlots: 0, anchorSlots: 0 },
        warnings: [],
        subProjects: [],
      };
    }

    const planner = new BundlePlanner();
    const results: BatchPlanSubProject[] = [];
    const warningMap = new Map<string, number>();
    let totalSlots = 0;
    let anchorSlots = 0;

    for (const sub of subProjects) {
      try {
        const plan = await planner.plan(sub.id);

        let slotCount = 0;
        let subAnchorSlots = 0;
        for (const p of plan) {
          for (const slot of p.slots) {
            if (slot.isAnchor) subAnchorSlots++;
            slotCount++;
            for (const w of slot.warnings) {
              const key = w.substring(0, 60);
              warningMap.set(key, (warningMap.get(key) || 0) + 1);
            }
          }
        }

        totalSlots += slotCount;
        anchorSlots += subAnchorSlots;

        let platforms: string[] = [];
        try {
          platforms = JSON.parse(sub.selectedPlatforms);
        } catch {
          // ignore
        }

        results.push({
          projectId: sub.id,
          status: 'succeeded',
          planId: plan[0] ? undefined : undefined,
          slotCount,
          platforms: Array.isArray(platforms) ? platforms : [],
        });
      } catch (e) {
        results.push({
          projectId: sub.id,
          status: 'failed',
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const warnings = Array.from(warningMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const succeeded = results.filter((r) => r.status === 'succeeded').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return {
      parentProjectId,
      summary: {
        total: subProjects.length,
        succeeded,
        failed,
        totalSlots,
        anchorSlots,
      },
      warnings,
      subProjects: results,
    };
  }
}
