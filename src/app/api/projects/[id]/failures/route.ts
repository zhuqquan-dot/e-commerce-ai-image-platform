import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const tasks = await prisma.generationTask.findMany({
      where: { projectId: id },
      include: {
        bundleSlot: { select: { slotType: true } },
        platformRulePack: { select: { platformName: true } },
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { errorMessage: true, status: true },
        },
      },
    });

    const failedTasks = tasks.filter((t) =>
      ['compile_failed', 'blocked', 'qc_blocked', 'generation_failed', 'provider_timeout', 'failed'].includes(t.status),
    );

    const items = failedTasks.map((t) => ({
      taskId: t.id,
      slotCode: t.slotCode,
      slotType: t.bundleSlot?.slotType || '',
      platform: t.platformRulePack?.platformName || '',
      status: t.status,
      reason: t.attempts[0]?.errorMessage || '',
      retryable: t.status !== 'compile_failed',
      retryCount: t.retryCount,
      manualRequired: t.manualRequired,
    }));

    const byCategory: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.status;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }

    return NextResponse.json({
      projectId: id,
      totalSlots: tasks.length,
      failedSlots: failedTasks.length,
      items,
      categories: {
        compile_failed: byCategory['compile_failed'] || [],
        provider_timeout: byCategory['provider_timeout'] || [],
        qc_blocked: byCategory['qc_blocked'] || [],
        generation_failed: byCategory['generation_failed'] || [],
        blocked: byCategory['blocked'] || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
