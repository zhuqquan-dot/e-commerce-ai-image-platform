import { prisma } from '@/lib/prisma';
import { AttemptStatus } from '@/types/enums';
import { GenerationRunner } from '@/generation/generation-runner';

const MAX_RETRY_COUNT = 3;

export interface RetryStrategy {
  strategy: 'auto_switch_provider' | 'block_retry' | 'regenerate' | 'auto_retry' | 'manual_required';
  retryable: boolean;
  reason: string;
  delayMs: number;
  suggestedAction: string;
}

export interface RetryResult {
  taskId: string;
  attemptId: string | null;
  strategy: RetryStrategy;
  success: boolean;
  error?: string;
}

function calcDelayMs(retryCount: number): number {
  switch (retryCount) {
    case 0: return 0;
    case 1: return 30000;
    case 2: return 60000;
    default: return 0;
  }
}

export class RetryEngine {
  private runner: GenerationRunner;

  constructor() {
    this.runner = new GenerationRunner();
  }

  async evaluateRetryStrategy(taskId: string): Promise<RetryStrategy> {
    const task = await prisma.generationTask.findUnique({
      where: { id: taskId },
      include: {
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        qcResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!task) {
      return {
        strategy: 'manual_required',
        retryable: false,
        reason: `任务 ${taskId} 不存在`,
        delayMs: 0,
        suggestedAction: '请确认任务ID是否正确',
      };
    }

    if (task.retryCount >= MAX_RETRY_COUNT) {
      return {
        strategy: 'manual_required',
        retryable: false,
        reason: `已达最大重试次数(${MAX_RETRY_COUNT}次)，需人工介入`,
        delayMs: 0,
        suggestedAction: '人工审核后决定放行/重新规划/废弃',
      };
    }

    const latestAttempt = task.attempts[0] ?? null;
    const latestQc = task.qcResults[0] ?? null;

    if (latestAttempt) {
      if (latestAttempt.status === AttemptStatus.TIMEOUT || latestAttempt.status === AttemptStatus.PROVIDER_FAILOVER) {
        return {
          strategy: 'auto_switch_provider',
          retryable: true,
          reason: `Provider ${latestAttempt.status === AttemptStatus.TIMEOUT ? '超时' : '故障转移'}，将自动切换供应商重试`,
          delayMs: 0,
          suggestedAction: '系统将自动切换到备用供应商重新生成',
        };
      }

      if (latestAttempt.errorMessage) {
        const lowerError = latestAttempt.errorMessage.toLowerCase();
        if (lowerError.includes('missing') || lowerError.includes('missing_field')) {
          return {
            strategy: 'block_retry',
            retryable: false,
            reason: '商品信息不全，请先补全商品再重试',
            delayMs: 0,
            suggestedAction: '补全商品 → 重新规划 → 重新生成',
          };
        }
      }
    }

    if (latestQc) {
      const suggestedAction = latestQc.suggestedAction;
      if (suggestedAction === 'regenerate') {
        return {
          strategy: 'regenerate',
          retryable: true,
          reason: 'QC 驳回建议重新生成',
          delayMs: 0,
          suggestedAction: '系统将按相同参数重新生成',
        };
      }
    }

    if (latestAttempt && latestAttempt.status === AttemptStatus.FAILED) {
      const delayMs = calcDelayMs(task.retryCount);
      return {
        strategy: 'auto_retry',
        retryable: true,
        reason: `生成失败，自动重试（第${task.retryCount + 1}次）`,
        delayMs,
        suggestedAction: delayMs > 0 ? `请等待 ${delayMs / 1000}s 后重试` : '系统将立即重试',
      };
    }

    return {
      strategy: 'manual_required',
      retryable: false,
      reason: `任务状态 "${task.status}" 不支持自动重试`,
      delayMs: 0,
      suggestedAction: '请确认任务状态后决定操作',
    };
  }

  async executeRetry(taskId: string, strategy: RetryStrategy): Promise<RetryResult> {
    if (!strategy.retryable) {
      return {
        taskId,
        attemptId: null,
        strategy,
        success: false,
        error: strategy.reason,
      };
    }

    const result = await this.runner.executeTask(taskId);

    return {
      taskId,
      attemptId: result.attemptId ?? null,
      strategy,
      success: result.success,
      error: result.error,
    };
  }
}

export const retryEngine = new RetryEngine();
