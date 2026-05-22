import { NextRequest, NextResponse } from 'next/server';
import { BatchBundlePlanner } from '@/planning/batch-bundle-planner';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const planner = new BatchBundlePlanner();
    const result = await planner.planBatch(id);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '批量规划失败', message }, { status: 500 });
  }
}
