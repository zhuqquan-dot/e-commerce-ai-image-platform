import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransaction = vi.fn();
const mockTaskFindUnique = vi.fn();
const mockTaskUpdate = vi.fn();
const mockTaskFindMany = vi.fn();
const mockReviewCreate = vi.fn();
const mockReviewFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    generationTask: {
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
      findMany: (...args: unknown[]) => mockTaskFindMany(...args),
    },
    reviewRecord: {
      create: (...args: unknown[]) => mockReviewCreate(...args),
      findMany: (...args: unknown[]) => mockReviewFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { ReviewService } from './review-service';

function makeTask(overrides: Partial<{ id: string; status: string; projectId: string }> = {}) {
  return {
    id: overrides.id || 'task-1',
    projectId: overrides.projectId || 'project-1',
    productId: 'product-1',
    platformPackId: 'pack-1',
    slotCode: 'main_white',
    bundleSlotId: 'slot-1',
    status: overrides.status || 'review_pending',
    creditCost: 1,
    retryCount: 0,
    manualRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReviewService();
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(Array.isArray(ops) ? ops.map(() => ({})) : []));
  });

  describe('approve', () => {
    it('creates review record and updates task status to approved', async () => {
      const task = makeTask({ id: 'task-1', status: 'review_pending' });
      mockTaskFindUnique.mockResolvedValue(task);

      const result = await service.approve('task-1', 'reviewer-1', 'looks good');

      expect(result).toEqual({
        taskId: 'task-1',
        action: 'approved',
        previousStatus: 'review_pending',
        newStatus: 'approved',
      });
      expect(mockTaskFindUnique).toHaveBeenCalledWith({ where: { id: 'task-1' } });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(service.approve('task-404', 'reviewer-1')).rejects.toThrow('任务不存在');
    });

    it('accepts reviewerId and comment', async () => {
      const task = makeTask({ id: 'task-2' });
      mockTaskFindUnique.mockResolvedValue(task);

      const result = await service.approve('task-2', 'reviewer-1');

      expect(result.taskId).toBe('task-2');
      expect(result.action).toBe('approved');
    });
  });

  describe('reject', () => {
    it('creates review record and updates task status to rejected', async () => {
      const task = makeTask({ id: 'task-1', status: 'review_pending' });
      mockTaskFindUnique.mockResolvedValue(task);

      const result = await service.reject('task-1', 'reviewer-1', 'background color is wrong');

      expect(result).toEqual({
        taskId: 'task-1',
        action: 'rejected',
        previousStatus: 'review_pending',
        newStatus: 'rejected',
      });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws when comment is empty', async () => {
      await expect(service.reject('task-1', 'reviewer-1', '')).rejects.toThrow('驳回原因不能为空');
    });

    it('throws when comment is whitespace only', async () => {
      await expect(service.reject('task-1', 'reviewer-1', '   ')).rejects.toThrow('驳回原因不能为空');
    });

    it('throws when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(service.reject('task-404', 'reviewer-1', 'bad quality')).rejects.toThrow('任务不存在');
    });
  });

  describe('riskMark', () => {
    it('creates review record with risk tags but keeps task status unchanged', async () => {
      const task = makeTask({ id: 'task-1', status: 'review_pending' });
      mockTaskFindUnique.mockResolvedValue(task);

      const result = await service.riskMark('task-1', 'reviewer-1', ['合规高风险', '需重生成'], 'check edge blur');

      expect(result).toEqual({
        taskId: 'task-1',
        action: 'risk_mark',
        previousStatus: 'review_pending',
        newStatus: 'review_pending',
      });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(
        service.riskMark('task-404', 'reviewer-1', ['tag1'], 'comment'),
      ).rejects.toThrow('任务不存在');
    });

    it('stores riskTags as JSON in comment', async () => {
      const task = makeTask({ id: 'task-1' });
      mockTaskFindUnique.mockResolvedValue(task);
      mockReviewCreate.mockResolvedValue({ id: 'review-1' });

      await service.riskMark('task-1', 'reviewer-1', ['tag-a', 'tag-b'], 'some issue');

      expect(mockReviewCreate).toHaveBeenCalledTimes(1);
      const createArgs = mockReviewCreate.mock.calls[0][0];
      const commentData = JSON.parse(createArgs.data.comment);
      expect(commentData.tags).toEqual(['tag-a', 'tag-b']);
      expect(commentData.comment).toBe('some issue');
    });
  });

  describe('batchApprove', () => {
    it('approves all tasks successfully', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(makeTask({ id: 'task-1', status: 'review_pending' }))
        .mockResolvedValueOnce(makeTask({ id: 'task-2', status: 'review_pending' }))
        .mockResolvedValueOnce(makeTask({ id: 'task-3', status: 'review_pending' }));

      const result = await service.batchApprove(['task-1', 'task-2', 'task-3'], 'reviewer-1');

      expect(result.total).toBe(3);
      expect(result.approved).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('handles partial failures without affecting the batch', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(makeTask({ id: 'task-1' }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeTask({ id: 'task-3' }));

      const result = await service.batchApprove(['task-1', 'task-2', 'task-3'], 'reviewer-1');

      expect(result.total).toBe(3);
      expect(result.approved).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].taskId).toBe('task-2');
      expect(result.errors[0].reason).toContain('任务不存在');
    });

    it('returns empty result for empty taskIds', async () => {
      const result = await service.batchApprove([], 'reviewer-1');

      expect(result.total).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getReviewStats', () => {
    it('returns correct stats for project', async () => {
      mockTaskFindMany.mockResolvedValue([
        makeTask({ id: 't1', status: 'pending' }),
        makeTask({ id: 't2', status: 'review_pending' }),
        makeTask({ id: 't3', status: 'approved' }),
        makeTask({ id: 't4', status: 'approved' }),
        makeTask({ id: 't5', status: 'rejected' }),
        makeTask({ id: 't6', status: 'draft' }),
      ]);

      mockReviewFindMany.mockResolvedValue([
        { taskId: 't2', action: 'risk_mark' },
      ]);

      const stats = await service.getReviewStats('project-1');

      expect(stats.total).toBe(6);
      expect(stats.approved).toBe(2);
      expect(stats.rejected).toBe(1);
      expect(stats.riskMarked).toBe(1);
      expect(stats.pending).toBe(2);
    });

    it('does not count approved/rejected tasks as riskMarked', async () => {
      mockTaskFindMany.mockResolvedValue([
        makeTask({ id: 't1', status: 'approved' }),
        makeTask({ id: 't2', status: 'rejected' }),
        makeTask({ id: 't3', status: 'review_pending' }),
      ]);

      mockReviewFindMany.mockResolvedValue([
        { taskId: 't1', action: 'risk_mark' },
        { taskId: 't2', action: 'risk_mark' },
        { taskId: 't3', action: 'risk_mark' },
      ]);

      const stats = await service.getReviewStats('project-1');

      expect(stats.riskMarked).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.pending).toBe(0);
    });

    it('handles project with no tasks', async () => {
      mockTaskFindMany.mockResolvedValue([]);

      const stats = await service.getReviewStats('empty-project');

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.rejected).toBe(0);
      expect(stats.riskMarked).toBe(0);
    });

    it('all tasks are pending when none are approved/rejected/riskMarked', async () => {
      mockTaskFindMany.mockResolvedValue([
        makeTask({ id: 't1', status: 'pending' }),
        makeTask({ id: 't2', status: 'review_pending' }),
        makeTask({ id: 't3', status: 'draft' }),
      ]);

      mockReviewFindMany.mockResolvedValue([]);

      const stats = await service.getReviewStats('project-1');

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.approved).toBe(0);
      expect(stats.rejected).toBe(0);
      expect(stats.riskMarked).toBe(0);
    });
  });
});
