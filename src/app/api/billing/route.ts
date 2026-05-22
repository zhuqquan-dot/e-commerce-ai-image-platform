import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { BillingService } from "@/commerce/billing-service";

const billingService = new BillingService();

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "缺少 workspaceId" }, { status: 400 });
    }

    const history = await billingService.getBillingHistory(workspaceId);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: "查询账单记录失败", message: String(error) },
      { status: 500 },
    );
  }
});
