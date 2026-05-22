import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttemptStatus } from '@/types/enums';

const mockGenerationTask = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

const mockPrisma = {
  generationTask: mockGenerationTask,
};

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

const mockExecuteTask = vi.fn();
vi.mock('@/generation/generation-runner', () => ({
  GenerationRunner: function MockGenerationRunner() {
    return { executeTask: mockExecuteTask };
  },
}));

const { RetryEngine } = await vi.importActual<typeof import('./retry-engine')>(
  './retry-engine',
);

function makeAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    taskId: 'task-1',
    providerConfigId: null,
    status: AttemptStatus.FAILED,
    generationSpec: null,
    promptText: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeQcResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'qc-1',
    taskId: 'task-1',
    consistencyScore: 80,
    styleScore: 80,
    complianceScore: 80,
    overallGrade: 'B',
    reasons: '[]',
    riskTags: '[]',
    suggestedAction: 'regenerate',
    aiDetectionInputReserved: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    projectId: 'proj-1',
    productId: 'prod-1',
    platformPackId: 'pack-1',
    slotCode: 'main_white',
    bundleSlotId: 'slot-1',
    status: 'failed',
    creditCost: 1,
    retryCount: 0,
    manualRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: [],
    qcResults: [],
    ...overrides,
  };
}

describe('RetryEngine', () => {
  let engine: InstanceType<typeof RetryEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new RetryEngine();
  });

  describe('evaluateRetryStrategy', () => {
    it('returns manual_required when task not found', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(null);

      const result = await engine.evaluateRetryStrategy('nonexistent');

      expect(result.strategy).toBe('manual_required');
      expect(result.retryable).toBe(false);
      expect(result.reason).toContain('不存在');
    });

    it('returns manual_required when retryCount >= 3', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({ retryCount: 3, attempts: [makeAttempt()], qcResults: [] }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('manual_required');
      expect(result.retryable).toBe(false);
      expect(result.reason).toContain('已达最大重试次数');
    });

    it('returns auto_switch_provider for timeout attempt', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          attempts: [makeAttempt({ status: AttemptStatus.TIMEOUT })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('auto_switch_provider');
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(0);
      expect(result.reason).toContain('超时');
    });

    it('returns auto_switch_provider for provider_failover attempt', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          attempts: [makeAttempt({ status: AttemptStatus.PROVIDER_FAILOVER })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('auto_switch_provider');
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(0);
      expect(result.reason).toContain('故障转移');
    });

    it('returns block_retry when errorMessage contains missing', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          attempts: [
            makeAttempt({
              status: AttemptStatus.FAILED,
              errorMessage: 'missing required field: color',
            }),
          ],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('block_retry');
      expect(result.retryable).toBe(false);
      expect(result.reason).toContain('商品信息不全');
      expect(result.suggestedAction).toContain('补全商品');
    });

    it('returns block_retry when errorMessage contains missing_field', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          attempts: [
            makeAttempt({
              status: AttemptStatus.FAILED,
              errorMessage: 'missing_field: productName',
            }),
          ],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('block_retry');
      expect(result.retryable).toBe(false);
    });

    it('returns regenerate when QC suggestedAction is regenerate', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          attempts: [makeAttempt({ status: AttemptStatus.SUCCEEDED })],
          qcResults: [makeQcResult({ suggestedAction: 'regenerate' })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('regenerate');
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(0);
      expect(result.reason).toContain('QC');
    });

    it('falls through QC when suggestedAction is not regenerate', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          attempts: [makeAttempt({ status: AttemptStatus.FAILED })],
          qcResults: [makeQcResult({ suggestedAction: 'review' })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('auto_retry');
    });

    it('returns auto_retry for general FAILED attempt', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          retryCount: 0,
          attempts: [makeAttempt({ status: AttemptStatus.FAILED })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('auto_retry');
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(0);
    });

    it('returns auto_retry with delay 30s when retryCount=1', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          retryCount: 1,
          attempts: [makeAttempt({ status: AttemptStatus.FAILED })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('auto_retry');
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(30000);
    });

    it('returns auto_retry with delay 60s when retryCount=2', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({
          retryCount: 2,
          attempts: [makeAttempt({ status: AttemptStatus.FAILED })],
        }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('auto_retry');
      expect(result.retryable).toBe(true);
      expect(result.delayMs).toBe(60000);
    });

    it('returns manual_required for unknown state with no attempts', async () => {
      mockGenerationTask.findUnique.mockResolvedValue(
        makeTask({ attempts: [], qcResults: [] }),
      );

      const result = await engine.evaluateRetryStrategy('task-1');

      expect(result.strategy).toBe('manual_required');
      expect(result.retryable).toBe(false);
    });
  });

  describe('executeRetry', () => {
    it('returns failure immediately when strategy is not retryable', async () => {
      const strategy = {
        strategy: 'block_retry' as const,
        retryable: false,
        reason: '商品信息不全',
        delayMs: 0,
        suggestedAction: '补全商品',
      };

      const result = await engine.executeRetry('task-1', strategy);

      expect(result.success).toBe(false);
      expect(result.error).toBe('商品信息不全');
      expect(result.attemptId).toBeNull();
      expect(mockExecuteTask).not.toHaveBeenCalled();
    });

    it('calls executeTask when strategy is retryable', async () => {
      mockExecuteTask.mockResolvedValue({
        success: true,
        status: 'generated',
        attemptId: 'attempt-new',
        assetIds: ['asset-1'],
      });

      const strategy = {
        strategy: 'auto_retry' as const,
        retryable: true,
        reason: '自动重试',
        delayMs: 0,
        suggestedAction: '系统将立即重试',
      };

      const result = await engine.executeRetry('task-1', strategy);

      expect(result.success).toBe(true);
      expect(result.attemptId).toBe('attempt-new');
      expect(mockExecuteTask).toHaveBeenCalledWith('task-1');
    });

    it('returns failure when executeTask fails', async () => {
      mockExecuteTask.mockResolvedValue({
        success: false,
        status: 'pending',
        attemptId: 'attempt-fail',
        error: '生成失败',
      });

      const strategy = {
        strategy: 'auto_retry' as const,
        retryable: true,
        reason: '自动重试',
        delayMs: 0,
        suggestedAction: '立即重试',
      };

      const result = await engine.executeRetry('task-1', strategy);

      expect(result.success).toBe(false);
      expect(result.attemptId).toBe('attempt-fail');
      expect(result.error).toBe('生成失败');
    });
  });
});
