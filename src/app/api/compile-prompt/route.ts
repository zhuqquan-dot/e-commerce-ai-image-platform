import { NextRequest, NextResponse } from 'next/server';
import { PromptCompiler } from '@/generation/prompt-compiler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const compiler = new PromptCompiler();
    const result = await compiler.compile(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
