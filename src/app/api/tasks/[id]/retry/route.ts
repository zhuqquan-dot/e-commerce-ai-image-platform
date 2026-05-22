import { NextRequest, NextResponse } from 'next/server'
import { retryEngine } from '@/control/retry-engine'
import { requireAuth, requireRole } from '@/auth/api-guard'

async function handlePOST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: taskId } = await params

    const strategy = await retryEngine.evaluateRetryStrategy(taskId)

    if (!strategy.retryable) {
      return NextResponse.json(
        {
          retryable: false,
          reason: strategy.reason,
          suggestedAction: strategy.suggestedAction,
        },
        { status: 409 },
      )
    }

    const result = await retryEngine.executeRetry(taskId, strategy)

    return NextResponse.json(
      {
        taskId: result.taskId,
        attemptId: result.attemptId,
        strategy: result.strategy.strategy,
        retryable: result.success,
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: '重试任务失败', message }, { status: 500 })
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'operator')(handlePOST))
