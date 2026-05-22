import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { PaymentService } from "@/commerce/payment-service";

const paymentService = new PaymentService();

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "缺少 workspaceId" }, { status: 400 });
    }

    const orders = await paymentService.getOrders(workspaceId);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: "查询订单失败", message: String(error) },
      { status: 500 },
    );
  }
});

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { workspaceId, type, amount, planId, fuelPackId } = body;

    if (!workspaceId || !type || amount == null) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const order = await paymentService.createOrder(
      workspaceId,
      type,
      amount,
      planId,
      fuelPackId,
    );
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建订单失败", message: String(error) },
      { status: 500 },
    );
  }
});
