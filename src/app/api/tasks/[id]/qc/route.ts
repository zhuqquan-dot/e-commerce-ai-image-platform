import { NextRequest, NextResponse } from 'next/server';
import { QCEngine } from '@/control/qc-engine';
import { prisma } from '@/lib/prisma';
import { failureRecovery } from '@/control/failure-recovery';
import { TaskStatus } from '@/types/enums';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { assetId } = body as { assetId?: string };

    if (!assetId) {
      return NextResponse.json(
        { error: '缺少参数', message: 'assetId 不能为空' },
        { status: 400 },
      );
    }

    const engine = new QCEngine();
    const result = await engine.check({ taskId, assetId });

    if (result.overallGrade === 'C') {
      const block = failureRecovery.handleQCBlock({
        overallGrade: result.overallGrade,
        riskTags: result.riskTags,
      });

      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.QC_BLOCKED },
      });

      return NextResponse.json({ ...result, failureAction: block }, { status: 201 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: '质检执行失败', message },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: taskId } = await params;

    const results = await prisma.qcResult.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    if (results.length === 0) {
      return NextResponse.json(
        { message: '暂无质检结果', results: [] },
        { status: 200 },
      );
    }

    const parsed = results.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      consistencyScore: r.consistencyScore,
      styleScore: r.styleScore,
      complianceScore: r.complianceScore,
      overallGrade: r.overallGrade,
      reasons: JSON.parse(r.reasons || '[]'),
      riskTags: JSON.parse(r.riskTags || '[]'),
      suggestedAction: r.suggestedAction,
      createdAt: r.createdAt,
    }));

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: '查询质检结果失败', message },
      { status: 500 },
    );
  }
}
