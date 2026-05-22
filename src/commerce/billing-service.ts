import { prisma } from "@/lib/prisma";

export class BillingService {
  async recordSubscriptionBilling(workspaceId: string, planId: string, amount: number) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error("工作区不存在");

    return prisma.creditRecord.create({
      data: {
        workspaceId,
        taskId: "",
        amount,
        balanceAfter: workspace.monthlyCredits + workspace.fuelCredits + amount,
        reason: "subscription_purchase",
      },
    });
  }

  async recordFuelPackBilling(workspaceId: string, fuelPackId: string, amount: number) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error("工作区不存在");

    return prisma.creditRecord.create({
      data: {
        workspaceId,
        taskId: "",
        amount,
        balanceAfter: workspace.monthlyCredits + workspace.fuelCredits + amount,
        reason: "fuel_pack_purchase",
      },
    });
  }

  async getBillingHistory(workspaceId: string) {
    return prisma.creditRecord.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCreditHistory(workspaceId: string) {
    return prisma.creditRecord.findMany({
      where: {
        workspaceId,
        amount: { lt: 0 },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
