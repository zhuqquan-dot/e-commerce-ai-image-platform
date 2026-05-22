import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SubProjectStatus {
  projectId: string;
  status: string;
  totalTasks: number;
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  blocked: number;
}

interface BatchStatusResult {
  parentProjectId: string;
  subProjects: SubProjectStatus[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: parentProjectId } = await params;

    const parent = await prisma.project.findUnique({
      where: { id: parentProjectId },
    });

    if (!parent) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    const children = await prisma.project.findMany({
      where: { parentProjectId },
      select: { id: true, status: true },
    });

    const childIds = children.map((c) => c.id);

    if (childIds.length === 0) {
      return NextResponse.json({
        parentProjectId,
        subProjects: [],
      } satisfies BatchStatusResult);
    }

    const tasks = await prisma.generationTask.findMany({
      where: { projectId: { in: childIds } },
      select: { projectId: true, status: true },
    });

    const tasksByProject = new Map<string, Array<{ status: string }>>();
    for (const task of tasks) {
      const list = tasksByProject.get(task.projectId) || [];
      list.push(task);
      tasksByProject.set(task.projectId, list);
    }

    const subProjects: SubProjectStatus[] = children.map((child) => {
      const projectTasks = tasksByProject.get(child.id) || [];
      const totalTasks = projectTasks.length;
      const pending = projectTasks.filter((t) => t.status === 'pending').length;
      const running = projectTasks.filter(
        (t) => t.status === 'running' || t.status === 'queued' || t.status === 'compiled',
      ).length;
      const succeeded = projectTasks.filter(
        (t) =>
          t.status === 'generated' ||
          t.status === 'approved' ||
          t.status === 'review_pending' ||
          t.status === 'exported',
      ).length;
      const failed = projectTasks.filter(
        (t) =>
          t.status === 'compile_failed' ||
          t.status === 'qc_failed' ||
          t.status === 'rejected',
      ).length;
      const blocked = projectTasks.filter(
        (t) => t.status === 'blocked' || t.status === 'qc_blocked',
      ).length;

      return {
        projectId: child.id,
        status: child.status,
        totalTasks,
        pending,
        running,
        succeeded,
        failed,
        blocked,
      };
    });

    return NextResponse.json({
      parentProjectId,
      subProjects,
    } satisfies BatchStatusResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '查询批次状态失败', message }, { status: 500 });
  }
}
