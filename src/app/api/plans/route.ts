import { NextRequest, NextResponse } from "next/server";
import { PlanService } from "@/commerce/plan-service";

const planService = new PlanService();

export async function GET() {
  try {
    const plans = await planService.getActivePlans();
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json(
      { error: "查询套餐列表失败", message: String(error) },
      { status: 500 },
    );
  }
}
