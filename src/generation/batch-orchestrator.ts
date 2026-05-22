import { prisma } from '@/lib/prisma';
import { TaskOrchestrator } from './task-orchestrator';

export interface BatchOrchestrateResult {
  parentProjectId: string;
  summary: {
    totalTasks: number;
    anchorTasks: number;
    created: number;
    failed: number;
    blocked: number;
  };
  subProjects: Array<{
    projectId: string;
    status: 'created' | 'partial_failed' | 'anchor_failed';
    taskCount: number;
    anchorDone: number;
  }>;
}

interface ChildWithSlots {
  id: string;
  status: string;
  bundlePlans: Array<{
    id: string;
    platform: string;
    status: string;
    bundleSlots: Array<{
      id: string;
      slotType: string;
      isAnchor: boolean;
      sequenceOrder: number;
    }>;
  }>;
}

export class BatchOrchestrator {
  private taskOrchestrator = new TaskOrchestrator();

  async orchestrateBatch(parentProjectId: string): Promise<BatchOrchestrateResult> {
    const parent = await prisma.project.findUnique({
      where: { id: parentProjectId },
    });

    if (!parent) {
      throw new Error(`Parent project not found: ${parentProjectId}`);
    }

    const children = await prisma.project.findMany({
      where: { parentProjectId },
      include: {
        bundlePlans: {
          include: {
            bundleSlots: {
              orderBy: { sequenceOrder: 'asc' },
            },
          },
        },
      },
    }) as unknown as ChildWithSlots[];

    if (children.length === 0) {
      throw new Error('No child projects found for batch generation');
    }

    const allSlotsWithProject = children.flatMap((child) =>
      child.bundlePlans.flatMap((plan) =>
        plan.bundleSlots.map((slot) => ({
          projectId: child.id,
          slotType: slot.slotType,
          isAnchor: slot.isAnchor,
          sequenceOrder: slot.sequenceOrder,
        })),
      ),
    );

    const totalTasks = allSlotsWithProject.length;
    const anchorTasks = allSlotsWithProject.filter((s) => s.isAnchor).length;

    const sortedAllSlots = [...allSlotsWithProject].sort((a, b) => {
      if (a.isAnchor && !b.isAnchor) return -1;
      if (!a.isAnchor && b.isAnchor) return 1;
      if (a.projectId !== b.projectId) {
        return a.projectId.localeCompare(b.projectId);
      }
      return a.sequenceOrder - b.sequenceOrder;
    });

    const projectOrder = Array.from(
      new Map(sortedAllSlots.map((s) => [s.projectId, s])).keys(),
    );

    const subProjects: BatchOrchestrateResult['subProjects'] = [];
    let totalCreated = 0;
    let totalFailed = 0;
    let totalBlocked = 0;

    const failedProjectIds = new Set<string>();

    for (const projectId of projectOrder) {
      if (failedProjectIds.has(projectId)) continue;

      const child = children.find((c) => c.id === projectId);
      if (!child) continue;

      const slotCount = allSlotsWithProject.filter((s) => s.projectId === projectId).length;
      const anchorCount = allSlotsWithProject.filter(
        (s) => s.projectId === projectId && s.isAnchor,
      ).length;

      try {
        if (child.bundlePlans.length === 0) {
          throw new Error('No bundle plans found. Please run planning first.');
        }

        const allPlanned = child.bundlePlans.every((p) => p.status === 'planned');
        if (!allPlanned) {
          throw new Error('Not all bundle plans are in planned status.');
        }

        const result = await this.taskOrchestrator.createTasksFromBundlePlan(projectId);

        if (result.taskCount === 0) {
          throw new Error('No tasks were created.');
        }

        totalCreated += result.taskCount;

        subProjects.push({
          projectId,
          status: 'created',
          taskCount: result.taskCount,
          anchorDone: anchorCount,
        });
      } catch (error) {
        totalFailed++;
        totalBlocked += slotCount;
        failedProjectIds.add(projectId);

        const anchorSlotExists = child.bundlePlans.some((p) =>
          p.bundleSlots.some((s) => s.isAnchor),
        );

        subProjects.push({
          projectId,
          status: anchorSlotExists ? 'anchor_failed' : 'partial_failed',
          taskCount: slotCount,
          anchorDone: 0,
        });
      }
    }

    return {
      parentProjectId,
      summary: {
        totalTasks,
        anchorTasks,
        created: totalCreated,
        failed: totalFailed,
        blocked: totalBlocked,
      },
      subProjects,
    };
  }
}
