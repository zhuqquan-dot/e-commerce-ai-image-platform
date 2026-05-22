import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attemptId } = body as { attemptId?: string };

    if (!attemptId) {
      return NextResponse.json(
        { error: '缺少 attemptId' },
        { status: 400 },
      );
    }

    const attempt = await prisma.generationAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: '生成记录不存在' },
        { status: 404 },
      );
    }

    let generationSpec: Record<string, unknown> = {};
    try {
      if (attempt.generationSpec) {
        generationSpec = JSON.parse(attempt.generationSpec);
      }
    } catch {
      return NextResponse.json(
        { error: 'generationSpec 解析失败' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      promptVersion: generationSpec.promptVersion ?? null,
      promptText: attempt.promptText,
      promptSections: generationSpec.promptSections ?? null,
      generationParams: generationSpec.generationParams ?? null,
      sourceAttemptId: attemptId,
      reused: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '复用 Prompt 失败', message: String(error) },
      { status: 500 },
    );
  }
}
