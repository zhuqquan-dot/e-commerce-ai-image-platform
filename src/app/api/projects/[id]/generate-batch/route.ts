import { NextRequest, NextResponse } from 'next/server';
import { BatchOrchestrator } from '@/generation/batch-orchestrator';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    const orchestrator = new BatchOrchestrator();
    const result = await orchestrator.orchestrateBatch(projectId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('not found') || message.includes('No child') ? 404 : 500;
    return NextResponse.json({ error: '批量生成失败', message }, { status });
  }
}
