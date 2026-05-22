import { prisma } from '@/lib/prisma';

export interface ReviewResult {
  taskId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
}

export interface BatchReviewResult {
  total: number;
  approved: number;
  failed: number;
  errors: Array<{ taskId: string; reason: string }>;
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  riskMarked: number;
}

export class ReviewService {
  async approve(
    taskId: string,
    reviewerId: string,
    comment?: string,
  ): Promise<ReviewResult> {
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('任务不存在');

    const previousStatus = task.status;

    await prisma.$transaction([
      prisma.reviewRecord.create({
        data: {
          taskId,
          action: 'approved',
          comment: comment || '',
          reviewerId: reviewerId,
        },
      }),
      prisma.generationTask.update({
        where: { id: taskId },
        data: { status: 'approved' },
      }),
    ]);

    return {
      taskId,
      action: 'approved',
      previousStatus,
      newStatus: 'approved',
    };
  }

  async reject(
    taskId: string,
    reviewerId: string,
    comment: string,
  ): Promise<ReviewResult> {
    if (!comment || comment.trim().length === 0) {
      throw new Error('驳回原因不能为空');
    }

    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('任务不存在');

    const previousStatus = task.status;

    await prisma.$transaction([
      prisma.reviewRecord.create({
        data: {
          taskId,
          action: 'rejected',
          comment,
          reviewerId,
        },
      }),
      prisma.generationTask.update({
        where: { id: taskId },
        data: { status: 'rejected' },
      }),
    ]);

    return {
      taskId,
      action: 'rejected',
      previousStatus,
      newStatus: 'rejected',
    };
  }

  async riskMark(
    taskId: string,
    reviewerId: string,
    riskTags: string[],
    comment: string,
  ): Promise<ReviewResult> {
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('任务不存在');

    const riskData = { tags: riskTags, comment };

    await prisma.$transaction([
      prisma.reviewRecord.create({
        data: {
          taskId,
          action: 'risk_mark',
          comment: JSON.stringify(riskData),
          reviewerId,
        },
      }),
    ]);

    return {
      taskId,
      action: 'risk_mark',
      previousStatus: task.status,
      newStatus: task.status,
    };
  }

  async batchApprove(
    taskIds: string[],
    reviewerId: string,
    comment?: string,
  ): Promise<BatchReviewResult> {
    const errors: Array<{ taskId: string; reason: string }> = [];
    let approved = 0;
    let failed = 0;

    for (const taskId of taskIds) {
      try {
        await this.approve(taskId, reviewerId, comment);
        approved++;
      } catch (error) {
        failed++;
        errors.push({ taskId, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    return { total: taskIds.length, approved, failed, errors };
  }

  async getReviewStats(projectId: string): Promise<ReviewStats> {
    const tasks = await prisma.generationTask.findMany({
      where: { projectId },
    });

    const total = tasks.length;
    const approved = tasks.filter((t) => t.status === 'approved').length;
    const rejected = tasks.filter((t) => t.status === 'rejected').length;

    const taskIds = tasks.map((t) => t.id);
    const riskMarkRecords = taskIds.length > 0
      ? await prisma.reviewRecord.findMany({
          where: {
            taskId: { in: taskIds },
            action: 'risk_mark',
          },
          distinct: ['taskId'],
        })
      : [];

    const riskMarkedTaskIds = new Set(riskMarkRecords.map((r) => r.taskId));
    const riskMarked = tasks.filter(
      (t) =>
        riskMarkedTaskIds.has(t.id) &&
        t.status !== 'approved' &&
        t.status !== 'rejected',
    ).length;

    const pending = total - approved - rejected - riskMarked;

    return { total, pending, approved, rejected, riskMarked };
  }

  async getReviewTimeline(taskId: string) {
    const records = await prisma.reviewRecord.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      action: r.action,
      comment: r.comment,
      reviewerId: r.reviewerId,
      createdAt: r.createdAt,
    }));
  }
}
