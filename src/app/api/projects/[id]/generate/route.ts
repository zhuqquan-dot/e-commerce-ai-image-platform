import { NextRequest, NextResponse } from 'next/server';
import { TaskOrchestrator } from '@/generation/task-orchestrator';
import { GenerationRunner } from '@/generation/generation-runner';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    const orchestrator = new TaskOrchestrator();
    const { taskCount, taskIds } =
      await orchestrator.createTasksFromBundlePlan(projectId);

    const runner = new GenerationRunner();
    const results: Array<{
      taskId: string;
      success: boolean;
      status: string;
      error?: string;
    }> = [];

    for (const taskId of taskIds) {
      const result = await runner.executeTask(taskId);
      results.push({
        taskId,
        success: result.success,
        status: result.status,
        error: result.error,
      });
    }

    const allCompleted = results.every((r) => r.success);

    if (allCompleted) {
      await orchestrator.updateProjectStatus(projectId, 'reviewing');
    }

    return NextResponse.json(
      {
        taskCount,
        taskIds,
        results,
        allCompleted,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '生成任务失败', message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const orchestrator = new TaskOrchestrator();
    const tasks = await orchestrator.getTaskQueue(projectId);

    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '查询任务失败', message }, { status: 500 });
  }
}
