import { describe, it, expect } from 'vitest';
import { FailureRecovery, failureRecovery } from './failure-recovery';

describe('FailureRecovery', () => {
  const fr = new FailureRecovery();

  describe('handleCompileFailure', () => {
    it('returns retryable=false when error contains missing', () => {
      const result = fr.handleCompileFailure({ id: 't1', error: 'missing required field: color' });
      expect(result.status).toBe('compile_failed');
      expect(result.retryable).toBe(false);
      expect(result.reason).toContain('编译失败');
      expect(result.reason).toContain('missing');
    });

    it('returns retryable=true for non-missing errors', () => {
      const result = fr.handleCompileFailure({ id: 't2', error: 'invalid template syntax' });
      expect(result.status).toBe('compile_failed');
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleProviderFailover', () => {
    it('returns provider_failover status with failover action', () => {
      const result = fr.handleProviderFailover({
        id: 'a1',
        providerName: 'OpenAI',
        error: 'rate limit exceeded',
      });
      expect(result.status).toBe('provider_failover');
      expect(result.action).toBe('failover_to_backup');
      expect(result.reason).toContain('OpenAI');
      expect(result.reason).toContain('rate limit exceeded');
    });
  });

  describe('handleTimeout', () => {
    it('returns timeout attemptStatus and running taskStatus', () => {
      const result = fr.handleTimeout('t1', 300);
      expect(result.attemptStatus).toBe('timeout');
      expect(result.taskStatus).toBe('running');
      expect(result.reason).toContain('300s');
      expect(result.reason).toContain('等待人工决策');
    });
  });

  describe('handleAnchorFailure', () => {
    it('returns blockedTasks list', () => {
      const result = fr.handleAnchorFailure('anchor1', ['dep1', 'dep2', 'dep3']);
      expect(result.blockedTasks).toEqual(['dep1', 'dep2', 'dep3']);
      expect(result.reason).toContain('anchor1');
      expect(result.reason).toContain('3');
      expect(result.reason).toContain('blocked');
    });

    it('handles empty dependent slot list', () => {
      const result = fr.handleAnchorFailure('anchor1', []);
      expect(result.blockedTasks).toEqual([]);
      expect(result.reason).toContain('0');
    });
  });

  describe('handleQCBlock', () => {
    it('returns qc_blocked status and enterReview=false', () => {
      const result = fr.handleQCBlock({
        overallGrade: 'C',
        riskTags: ['合规高风险', '已拦截'],
      });
      expect(result.status).toBe('qc_blocked');
      expect(result.enterReview).toBe(false);
      expect(result.reason).toContain('C');
      expect(result.reason).toContain('合规高风险');
      expect(result.reason).toContain('已拦截');
    });
  });

  describe('summarizeFailures', () => {
    it('correctly counts each failure type', () => {
      const tasks = [
        { id: 't1', status: 'compile_failed', bundleSlotId: 's1', slotCode: 'main_white' },
        { id: 't2', status: 'compile_failed', bundleSlotId: 's2', slotCode: 'feature' },
        { id: 't3', status: 'blocked', bundleSlotId: 's3', slotCode: 'scene' },
        { id: 't4', status: 'qc_blocked', bundleSlotId: 's4', slotCode: 'spec' },
        { id: 't5', status: 'generated', bundleSlotId: 's5', slotCode: 'compare' },
        { id: 't6', status: 'approved', bundleSlotId: 's6', slotCode: 'trust' },
      ];

      const summary = fr.summarizeFailures('p1', tasks);

      expect(summary.projectId).toBe('p1');
      expect(summary.totalSlots).toBe(6);
      expect(summary.compilingFailed).toBe(2);
      expect(summary.blockedSlots).toBe(1);
      expect(summary.qcBlockedSlots).toBe(1);
      expect(summary.failedSlots).toBe(4);
      expect(summary.timeoutSlots).toBe(0);
      expect(summary.failures).toHaveLength(4);
    });

    it('calculates recoverableCount correctly', () => {
      const tasks = [
        { id: 't1', status: 'compile_failed', bundleSlotId: 's1', slotCode: 'main_white' },
        { id: 't2', status: 'blocked', bundleSlotId: 's2', slotCode: 'feature' },
      ];

      const summary = fr.summarizeFailures('p1', tasks);

      expect(summary.recoverableCount).toBe(1);
      expect(summary.failures[0].retryable).toBe(false);
      expect(summary.failures[1].retryable).toBe(true);
    });

    it('generates suggestedActions for compile_failed', () => {
      const tasks = [
        { id: 't1', status: 'compile_failed', bundleSlotId: 's1', slotCode: 'main_white' },
        { id: 't2', status: 'generated', bundleSlotId: 's2', slotCode: 'feature' },
      ];

      const summary = fr.summarizeFailures('p1', tasks);
      expect(summary.suggestedActions).toContain('补全商品必填字段后重试编译');
    });

    it('generates suggestedActions for blocked and qcBlocked', () => {
      const tasks = [
        { id: 't1', status: 'blocked', bundleSlotId: 's1', slotCode: 'scene' },
        { id: 't2', status: 'qc_blocked', bundleSlotId: 's2', slotCode: 'spec' },
      ];

      const summary = fr.summarizeFailures('p1', tasks);
      expect(summary.suggestedActions).toContain('解决锚点图问题后重试关联slot');
      expect(summary.suggestedActions).toContain('QC C级拦截：检查图片合规性');
    });

    it('handles empty task list', () => {
      const summary = fr.summarizeFailures('p1', []);
      expect(summary.totalSlots).toBe(0);
      expect(summary.failedSlots).toBe(0);
      expect(summary.failures).toHaveLength(0);
      expect(summary.suggestedActions).toHaveLength(0);
    });

    it('counts timeoutSlots', () => {
      const tasks = [
        { id: 't1', status: 'timeout', bundleSlotId: 's1', slotCode: 'main_white' },
        { id: 't2', status: 'timeout', bundleSlotId: 's2', slotCode: 'feature' },
        { id: 't3', status: 'generated', bundleSlotId: 's3', slotCode: 'scene' },
      ];

      const summary = fr.summarizeFailures('p1', tasks);
      expect(summary.timeoutSlots).toBe(2);
      expect(summary.failedSlots).toBe(0);
    });
  });

  describe('singleton export', () => {
    it('failureRecovery is an instance of FailureRecovery', () => {
      expect(failureRecovery).toBeInstanceOf(FailureRecovery);
    });
  });
});
