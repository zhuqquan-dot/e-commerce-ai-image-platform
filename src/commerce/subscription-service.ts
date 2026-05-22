import { prisma } from '@/lib/prisma';

export type SubscriptionPeriod = 'monthly' | 'yearly';

export interface SubscriptionWithPlan {
  id: string;
  workspaceId: string;
  planId: string;
  period: string;
  status: string;
  startAt: Date;
  endAt: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    monthlyCredits: number;
  };
}

function calcEndAt(period: SubscriptionPeriod, startAt: Date): Date {
  const end = new Date(startAt);
  if (period === 'yearly') {
    end.setDate(end.getDate() + 365);
  } else {
    end.setDate(end.getDate() + 30);
  }
  return end;
}

function calcNextMonthStart(): Date {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next;
}

export class SubscriptionService {
  async subscribe(
    workspaceId: string,
    planId: string,
    period: SubscriptionPeriod,
  ): Promise<SubscriptionWithPlan> {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('套餐不存在');
    if (!plan.isActive) throw new Error('套餐已下架');

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('工作区不存在');

    const now = new Date();
    const endAt = calcEndAt(period, now);
    const quotaResetAt = calcNextMonthStart();

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          workspaceId,
          planId,
          period,
          status: 'active',
          startAt: now,
          endAt,
          autoRenew: false,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              monthlyPrice: true,
              yearlyPrice: true,
              monthlyCredits: true,
            },
          },
        },
      });

      await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          planId,
          monthlyCredits: workspace.monthlyCredits + plan.monthlyCredits,
          subscriptionStatus: 'active',
          quotaResetAt,
        },
      });

      return sub;
    });

    return subscription as unknown as SubscriptionWithPlan;
  }

  async upgrade(workspaceId: string, newPlanId: string): Promise<SubscriptionWithPlan> {
    const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new Error('目标套餐不存在');
    if (!newPlan.isActive) throw new Error('目标套餐已下架');

    const activeSub = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
      include: { plan: true },
    });
    if (!activeSub) throw new Error('当前无有效订阅');

    if (activeSub.plan.monthlyPrice >= newPlan.monthlyPrice) {
      throw new Error('升级目标套餐价格必须高于当前套餐');
    }

    const creditDiff = newPlan.monthlyCredits - activeSub.plan.monthlyCredits;

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id: activeSub.id },
        data: {
          planId: newPlanId,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              monthlyPrice: true,
              yearlyPrice: true,
              monthlyCredits: true,
            },
          },
        },
      });

      await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          planId: newPlanId,
          monthlyCredits: { increment: Math.max(creditDiff, 0) },
        },
      });

      return sub;
    });

    return subscription as unknown as SubscriptionWithPlan;
  }

  async downgrade(workspaceId: string, newPlanId: string): Promise<{ scheduled: boolean; message: string }> {
    const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new Error('目标套餐不存在');

    const activeSub = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
      include: { plan: true },
    });
    if (!activeSub) throw new Error('当前无有效订阅');

    if (activeSub.plan.monthlyPrice <= newPlan.monthlyPrice) {
      throw new Error('降级目标套餐价格必须低于当前套餐');
    }

    return {
      scheduled: true,
      message: '降级将在当前订阅周期结束后生效',
    };
  }

  async renew(workspaceId: string): Promise<SubscriptionWithPlan> {
    const activeSub = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
    });
    if (!activeSub) throw new Error('当前无有效订阅');

    const now = new Date();
    const newEndAt = calcEndAt(activeSub.period as SubscriptionPeriod, now);
    const quotaResetAt = calcNextMonthStart();

    const plan = await prisma.plan.findUnique({ where: { id: activeSub.planId } });

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id: activeSub.id },
        data: {
          startAt: now,
          endAt: newEndAt,
          status: 'active',
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              monthlyPrice: true,
              yearlyPrice: true,
              monthlyCredits: true,
            },
          },
        },
      });

      if (plan) {
        await tx.workspace.update({
          where: { id: workspaceId },
          data: {
            monthlyCredits: { increment: plan.monthlyCredits },
            quotaResetAt,
          },
        });
      }

      return sub;
    });

    return subscription as unknown as SubscriptionWithPlan;
  }

  async cancel(workspaceId: string): Promise<{ id: string; status: string }> {
    const activeSub = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
    });
    if (!activeSub) throw new Error('当前无有效订阅');

    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id: activeSub.id },
        data: { status: 'cancelled', autoRenew: false },
      });

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { subscriptionStatus: 'cancelled' },
      });

      return sub;
    });

    return { id: result.id, status: result.status };
  }

  async checkExpiry(workspaceId: string): Promise<boolean> {
    const activeSub = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
    });
    if (!activeSub) return true;

    return new Date() > activeSub.endAt;
  }

  async getActiveSubscription(workspaceId: string): Promise<SubscriptionWithPlan | null> {
    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            monthlyPrice: true,
            yearlyPrice: true,
            monthlyCredits: true,
          },
        },
      },
    });

    return subscription as unknown as SubscriptionWithPlan | null;
  }
}
