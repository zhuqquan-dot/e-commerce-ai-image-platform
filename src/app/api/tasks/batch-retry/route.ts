import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { retryEngine } from '@/control/retry-engine';

const batchRetrySchema = z.object({
  taskIds: z.array(z.string()).min(1, '至少需要1个任务ID'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = batchRetrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '校验失败', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { taskIds } = parsed.data;

    const errors: { taskId: string; reason: string }[] = [];
    const results: { taskId: string; attemptId: string | null; strategy: string }[] = [];
    let retried = 0;
    let failed = 0;

    for (const taskId of taskIds) {
      try {
        const strategy = await retryEngine.evaluateRetryStrategy(taskId);

        if (!strategy.retryable) {
          failed++;
          errors.push({ taskId, reason: strategy.reason });
          continue;
        }

        const result = await retryEngine.executeRetry(taskId, strategy);

        if (result.success) {
          retried++;
          results.push({
            taskId: result.taskId,
            attemptId: result.attemptId,
            strategy: result.strategy.strategy,
          });
        } else {
          failed++;
          errors.push({
            taskId: result.taskId,
            reason: result.error ?? result.strategy.reason,
          });
        }
      } catch (error) {
        failed++;
        errors.push({
          taskId,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      total: taskIds.length,
      retried,
      failed,
      errors,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '批量重试失败', message: String(error) },
      { status: 500 },
    );
  }
}
