import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/control/retry-engine');

import { POST } from '@/app/api/tasks/batch-retry/route';
import { retryEngine } from '@/control/retry-engine';

function makeStrategy(overrides: Record<string, unknown> = {}) {
  return {
    strategy: 'auto_retry',
    retryable: true,
    reason: '自动重试',
    delayMs: 0,
    suggestedAction: '系统将立即重试',
    ...overrides,
  };
}

function makeRetryResult(overrides: Record<string, unknown> = {}) {
  return {
    taskId: 'task-1',
    attemptId: 'attempt-new',
    strategy: makeStrategy(),
    success: true,
    ...overrides,
  };
}

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tasks/batch-retry', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('批量重试 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常批量重试：所有任务可重试且成功', async () => {
    vi.mocked(retryEngine.evaluateRetryStrategy).mockResolvedValue(makeStrategy());
    vi.mocked(retryEngine.executeRetry)
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-1', attemptId: 'attempt-a' }))
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-2', attemptId: 'attempt-b' }))
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-3', attemptId: 'attempt-c' }));

    const req = buildRequest({ taskIds: ['task-1', 'task-2', 'task-3'] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.retried).toBe(3);
    expect(body.failed).toBe(0);
    expect(body.errors).toHaveLength(0);
    expect(body.results).toHaveLength(3);
    expect(body.results[0].taskId).toBe('task-1');
    expect(body.results[0].attemptId).toBe('attempt-a');
    expect(body.results[1].taskId).toBe('task-2');
    expect(body.results[1].attemptId).toBe('attempt-b');
    expect(body.results[2].taskId).toBe('task-3');
    expect(body.results[2].attemptId).toBe('attempt-c');
  });

  it('部分任务 retryable=false 被计入 failed', async () => {
    vi.mocked(retryEngine.evaluateRetryStrategy)
      .mockResolvedValueOnce(makeStrategy({ retryable: true }))
      .mockResolvedValueOnce(makeStrategy({
        strategy: 'manual_required',
        retryable: false,
        reason: '已达最大重试次数(3次)，需人工介入',
      }))
      .mockResolvedValueOnce(makeStrategy({ retryable: true }));

    vi.mocked(retryEngine.executeRetry)
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-1', attemptId: 'attempt-a' }))
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-3', attemptId: 'attempt-c' }));

    const req = buildRequest({ taskIds: ['task-1', 'task-2', 'task-3'] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.retried).toBe(2);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].taskId).toBe('task-2');
    expect(body.errors[0].reason).toContain('已达最大重试次数');
    expect(body.results).toHaveLength(2);
  });

  it('executeRetry 返回 success=false 计入 failed', async () => {
    vi.mocked(retryEngine.evaluateRetryStrategy).mockResolvedValue(makeStrategy({ retryable: true }));
    vi.mocked(retryEngine.executeRetry).mockResolvedValueOnce(
      makeRetryResult({ taskId: 'task-1', success: false, error: '生成失败' }),
    );

    const req = buildRequest({ taskIds: ['task-1'] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.retried).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].taskId).toBe('task-1');
    expect(body.errors[0].reason).toBe('生成失败');
  });

  it('executeRetry 抛异常被捕获并计入 failed', async () => {
    vi.mocked(retryEngine.evaluateRetryStrategy).mockResolvedValue(makeStrategy({ retryable: true }));
    vi.mocked(retryEngine.executeRetry).mockRejectedValueOnce(new Error('数据库连接超时'));

    const req = buildRequest({ taskIds: ['task-1'] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.total).toBe(1);
    expect(body.retried).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].taskId).toBe('task-1');
    expect(body.errors[0].reason).toBe('数据库连接超时');
  });

  it('单个任务失败不影响其他任务', async () => {
    vi.mocked(retryEngine.evaluateRetryStrategy)
      .mockResolvedValueOnce(makeStrategy({ retryable: true }))
      .mockResolvedValueOnce(makeStrategy({
        strategy: 'block_retry',
        retryable: false,
        reason: '商品信息不全，请先补全商品再重试',
      }))
      .mockResolvedValueOnce(makeStrategy({ retryable: true }));

    vi.mocked(retryEngine.executeRetry)
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-1', attemptId: 'attempt-a', success: true }))
      .mockResolvedValueOnce(makeRetryResult({ taskId: 'task-3', attemptId: 'attempt-c', success: true }));

    const req = buildRequest({ taskIds: ['task-1', 'task-2', 'task-3'] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.retried).toBe(2);
    expect(body.failed).toBe(1);
    expect(body.errors[0].taskId).toBe('task-2');
    expect(body.errors[0].reason).toContain('商品信息不全');
    expect(retryEngine.executeRetry).toHaveBeenCalledTimes(2);
  });

  it('空 taskIds 返回 400', async () => {
    const req = buildRequest({ taskIds: [] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('校验失败');
    expect(body.details).toBeDefined();
    expect(retryEngine.evaluateRetryStrategy).not.toHaveBeenCalled();
  });

  it('缺少 taskIds 字段返回 400', async () => {
    const req = buildRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('校验失败');
    expect(body.details).toBeDefined();
  });
});
