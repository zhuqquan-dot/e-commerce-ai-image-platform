import { prisma } from '@/lib/prisma';
import { TaskStatus, ProjectStatus } from '@/types/enums';

export interface TaskQueueItem {
  taskId: string;
  slotType: string;
  platform: string;
  isAnchor: boolean;
  sequenceOrder: number;
  status: string;
  creditCost: number;
  retryCount: number;
  exportNameSuggestion: string;
  bundleSlotId: string;
}

export class TaskOrchestrator {
  async createTasksFromBundlePlan(projectId: string): Promise<{
    taskCount: number;
    taskIds: string[];
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        bundlePlans: {
          include: {
            bundleSlots: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (project.bundlePlans.length === 0) {
      throw new Error('No bundle plans found. Please run planning first.');
    }

    const existingTasks = await prisma.generationTask.findMany({
      where: { projectId },
      select: { bundleSlotId: true },
    });
    const existingSlotIds = new Set(existingTasks.map((t) => t.bundleSlotId));

    const taskIds: string[] = [];

    for (const plan of project.bundlePlans) {
      const platformRulePack = await prisma.platformRulePack.findUnique({
        where: { platformName: plan.platform },
      });

      if (!platformRulePack) {
        throw new Error(`PlatformRulePack not found for platform: ${plan.platform}`);
      }

      for (const slot of plan.bundleSlots) {
        if (existingSlotIds.has(slot.id)) {
          const existingTask = await prisma.generationTask.findFirst({
            where: { bundleSlotId: slot.id },
            select: { id: true },
          });
          if (existingTask) {
            taskIds.push(existingTask.id);
          }
          continue;
        }

        const creditCost = slot.isAnchor ? 2 : 1;

        const task = await prisma.generationTask.create({
          data: {
            projectId,
            productId: project.productId,
            platformPackId: platformRulePack.id,
            slotCode: slot.slotType,
            bundleSlotId: slot.id,
            status: TaskStatus.PENDING,
            creditCost,
            retryCount: 0,
          },
        });

        taskIds.push(task.id);
      }
    }

    await this.updateProjectStatus(projectId, ProjectStatus.GENERATING);

    return { taskCount: taskIds.length, taskIds };
  }

  async getTaskQueue(projectId: string): Promise<TaskQueueItem[]> {
    const tasks = await prisma.generationTask.findMany({
      where: { projectId },
      include: {
        bundleSlot: {
          include: {
            bundlePlan: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const getAnchorPriority = (slotType: string, isAnchor: boolean): number => {
      if (isAnchor) return 0;
      if (slotType === 'main_white' || slotType === 'main_text') return 1;
      return 2;
    };

    const sorted = tasks.sort((a, b) => {
      const aAnchorPriority = getAnchorPriority(
        a.bundleSlot.slotType,
        a.bundleSlot.isAnchor,
      );
      const bAnchorPriority = getAnchorPriority(
        b.bundleSlot.slotType,
        b.bundleSlot.isAnchor,
      );
      if (aAnchorPriority !== bAnchorPriority) {
        return aAnchorPriority - bAnchorPriority;
      }
      return a.bundleSlot.sequenceOrder - b.bundleSlot.sequenceOrder;
    });

    return sorted.map((task) => ({
      taskId: task.id,
      slotType: task.bundleSlot.slotType,
      platform: task.bundleSlot.bundlePlan.platform,
      isAnchor: task.bundleSlot.isAnchor,
      sequenceOrder: task.bundleSlot.sequenceOrder,
      status: task.status,
      creditCost: task.creditCost,
      retryCount: task.retryCount,
      exportNameSuggestion: task.bundleSlot.exportNameSuggestion,
      bundleSlotId: task.bundleSlotId,
    }));
  }

  async updateProjectStatus(projectId: string, status: string): Promise<void> {
    await prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }
}
