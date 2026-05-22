import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { PaymentService } from "@/commerce/payment-service";

const paymentService = new PaymentService();

export const GET = requireAuth(
  async (_request: NextRequest, { params }: { params: Promise<{ orderNo: string }> }) => {
    try {
      const { orderNo } = await params;
      const order = await paymentService.getOrderByNo(orderNo);
      if (!order) {
        return NextResponse.json({ error: "订单不存在" }, { status: 404 });
      }
      return NextResponse.json(order);
    } catch (error) {
      return NextResponse.json(
        { error: "查询订单详情失败", message: String(error) },
        { status: 500 },
      );
    }
  },
);
