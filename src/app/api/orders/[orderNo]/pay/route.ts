import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { PaymentService } from "@/commerce/payment-service";

const paymentService = new PaymentService();

export const POST = requireAuth(
  async (request: NextRequest, { params }: { params: Promise<{ orderNo: string }> }) => {
    try {
      const { orderNo } = await params;
      const body = await request.json().catch(() => ({}));
      const order = await paymentService.confirmPayment(orderNo, body.paymentMethod);
      return NextResponse.json(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "订单不存在" || message === "订单状态不允许支付") {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      return NextResponse.json(
        { error: "确认支付失败", message },
        { status: 500 },
      );
    }
  },
);
