import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/commerce/subscription-service";

function generateOrderNo(): string {
  const hex = Math.random().toString(16).slice(2, 6).padEnd(4, "0");
  return `ORD-${Date.now()}-${hex}`;
}

export class PaymentService {
  private subscriptionService = new SubscriptionService();

  async createOrder(
    workspaceId: string,
    type: string,
    amount: number,
    planId?: string,
    fuelPackId?: string,
  ) {
    return prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        workspaceId,
        type,
        amount,
        planId: planId ?? null,
        fuelPackId: fuelPackId ?? null,
        status: "unpaid",
      },
    });
  }

  async confirmPayment(orderNo: string, paymentMethod?: string) {
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order) throw new Error("订单不存在");
    if (order.status !== "unpaid") throw new Error("订单状态不允许支付");

    const now = new Date();

    if (order.type === "subscription" && order.planId) {
      await this.subscriptionService.subscribe(order.workspaceId, order.planId, "monthly");
    }

    if (order.type === "fuel_pack" && order.fuelPackId) {
      const fuelPack = await prisma.fuelPack.findUnique({ where: { id: order.fuelPackId } });
      if (fuelPack) {
        await prisma.workspace.update({
          where: { id: order.workspaceId },
          data: { fuelCredits: { increment: fuelPack.credits } },
        });
      }
    }

    return prisma.order.update({
      where: { orderNo },
      data: {
        status: "paid",
        paymentMethod: paymentMethod ?? null,
        paidAt: now,
      },
    });
  }

  async getOrders(workspaceId: string) {
    return prisma.order.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOrderByNo(orderNo: string) {
    return prisma.order.findUnique({ where: { orderNo } });
  }
}
