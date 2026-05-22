import { NextRequest, NextResponse } from "next/server";
import { PlanService } from "@/commerce/plan-service";

const planService = new PlanService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const plan = await planService.getPlanById(id);

    if (!plan) {
      return NextResponse.json({ error: "套餐不存在" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: "查询套餐详情失败", message: String(error) },
      { status: 500 },
    );
  }
}
