import { NextRequest, NextResponse } from 'next/server';
import { BundlePlanner } from '@/planning/bundle-planner';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const planner = new BundlePlanner();
    const plan = await planner.plan(id);

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '图包规划失败', message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const planner = new BundlePlanner();
    const plan = await planner.getPlan(id);

    if (plan.length === 0) {
      return NextResponse.json({ message: '暂无规划', plan: [] }, { status: 200 });
    }

    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: '查询规划失败', message }, { status: 500 });
  }
}
