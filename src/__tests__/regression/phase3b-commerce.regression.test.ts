import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  const mockPlanFindMany = vi.fn();
  const mockPlanFindUnique = vi.fn();
  const mockPlanUpsert = vi.fn();
  const mockWorkspaceFindUnique = vi.fn();
  const mockWorkspaceUpdate = vi.fn();
  const mockSubscriptionCreate = vi.fn();
  const mockSubscriptionFindFirst = vi.fn();
  const mockSubscriptionUpdate = vi.fn();
  const mockOrderCreate = vi.fn();
  const mockOrderFindUnique = vi.fn();
  const mockOrderUpdate = vi.fn();
  const mockFuelPackFindUnique = vi.fn();
  const mockProjectCount = vi.fn();
  const mockClientSpaceCount = vi.fn();
  const mockMemberCount = vi.fn();
  const mockBrandPackCount = vi.fn();
  const mockSeriesPackCount = vi.fn();
  const mockExportPackCount = vi.fn();
  const mockCreditRecordCreate = vi.fn();
  const mockTransaction = vi.fn();

  return {
    prisma: {
      plan: {
        findMany: mockPlanFindMany,
        findUnique: mockPlanFindUnique,
        upsert: mockPlanUpsert,
      },
      workspace: {
        findUnique: mockWorkspaceFindUnique,
        update: mockWorkspaceUpdate,
      },
      subscription: {
        create: mockSubscriptionCreate,
        findFirst: mockSubscriptionFindFirst,
        update: mockSubscriptionUpdate,
      },
      order: {
        create: mockOrderCreate,
        findUnique: mockOrderFindUnique,
        update: mockOrderUpdate,
      },
      fuelPack: {
        findUnique: mockFuelPackFindUnique,
      },
      project: { count: mockProjectCount },
      clientSpace: { count: mockClientSpaceCount },
      member: { count: mockMemberCount },
      brandPack: { count: mockBrandPackCount },
      seriesPack: { count: mockSeriesPackCount },
      exportPack: { count: mockExportPackCount },
      creditRecord: { create: mockCreditRecordCreate },
      $transaction: mockTransaction,
    },
  };
});

import { PlanService } from "@/commerce/plan-service";
import { SubscriptionService } from "@/commerce/subscription-service";
import { QuotaEngine } from "@/commerce/quota-engine";
import { PaymentService } from "@/commerce/payment-service";
import { prisma } from "@/lib/prisma";

const mockPlanFindMany = vi.mocked(prisma.plan.findMany);
const mockPlanFindUnique = vi.mocked(prisma.plan.findUnique);
const mockWorkspaceFindUnique = vi.mocked(prisma.workspace.findUnique);
const mockWorkspaceUpdate = vi.mocked(prisma.workspace.update);
const mockSubscriptionCreate = vi.mocked(prisma.subscription.create);
const mockSubscriptionFindFirst = vi.mocked(prisma.subscription.findFirst);
const mockSubscriptionUpdate = vi.mocked(prisma.subscription.update);
const mockOrderCreate = vi.mocked(prisma.order.create);
const mockOrderFindUnique = vi.mocked(prisma.order.findUnique);
const mockOrderUpdate = vi.mocked(prisma.order.update);
const mockFuelPackFindUnique = vi.mocked(prisma.fuelPack.findUnique);
const mockProjectCount = vi.mocked(prisma.project.count);
const mockClientSpaceCount = vi.mocked(prisma.clientSpace.count);
const mockMemberCount = vi.mocked(prisma.member.count);
const mockTransaction = vi.mocked(prisma.$transaction);

const PLAN_1 = {
  id: "plan-1",
  name: "个人版",
  monthlyPrice: 99,
  yearlyPrice: 990,
  monthlyCredits: 3000,
  memberLimit: 1,
  clientSpaceLimit: 1,
  brandPackLimit: 1,
  seriesPackLimit: 3,
  projectLimit: 5,
  exportLimit: 10,
  batchEnabled: false,
  multiPlatformEnabled: false,
  reviewEnabled: true,
  exportEnabled: true,
  yearlyDiscount: 0.17,
  creditCarryOverRatio: 0.0,
  displayOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PLAN_2 = {
  ...PLAN_1,
  id: "plan-2",
  name: "团队版",
  monthlyPrice: 399,
  yearlyPrice: 3990,
  monthlyCredits: 15000,
  memberLimit: 10,
  clientSpaceLimit: 5,
  brandPackLimit: 3,
  seriesPackLimit: 10,
  projectLimit: 30,
  exportLimit: 50,
  batchEnabled: true,
  multiPlatformEnabled: true,
  displayOrder: 2,
};

const WORKSPACE = {
  id: "ws-1",
  name: "测试工作区",
  ownerUserId: "user-1",
  type: "standard",
  planId: null,
  monthlyCredits: 0,
  fuelCredits: 0,
  channelPartnerId: null,
  subscriptionStatus: "trial",
  quotaResetAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  plan: null,
  channelPartner: null,
};

describe("Phase 3b — PlanService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getActivePlans returns active plans ordered by displayOrder", async () => {
    mockPlanFindMany.mockResolvedValue([PLAN_1, PLAN_2]);
    const service = new PlanService();
    const result = await service.getActivePlans();
    expect(result).toHaveLength(2);
    expect(mockPlanFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  });

  it("getPlanById returns plan or null", async () => {
    mockPlanFindUnique.mockResolvedValue(PLAN_1);
    const service = new PlanService();
    const result = await service.getPlanById("plan-1");
    expect(result?.name).toBe("个人版");
  });
});

describe("Phase 3b — SubscriptionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribe creates subscription and grants credits", async () => {
    mockPlanFindUnique.mockResolvedValue(PLAN_2);
    mockWorkspaceFindUnique.mockResolvedValue(WORKSPACE);
    mockTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        subscription: { create: mockSubscriptionCreate },
        workspace: { update: mockWorkspaceUpdate },
      };
      mockSubscriptionCreate.mockResolvedValue({
        id: "sub-1",
        workspaceId: "ws-1",
        planId: "plan-2",
        period: "monthly",
        status: "active",
        plan: { id: "plan-2", name: "团队版", monthlyPrice: 399, yearlyPrice: 3990, monthlyCredits: 15000 },
      });
      mockWorkspaceUpdate.mockResolvedValue({ ...WORKSPACE, planId: "plan-2" });
      return await fn(tx);
    });

    const service = new SubscriptionService();
    const result = await service.subscribe("ws-1", "plan-2", "monthly");
    expect(result.planId).toBe("plan-2");
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("subscribe throws if plan not found", async () => {
    mockPlanFindUnique.mockResolvedValue(null);
    const service = new SubscriptionService();
    await expect(service.subscribe("ws-1", "nonexistent", "monthly")).rejects.toThrow("套餐不存在");
  });

  it("cancel sets subscription and workspace status to cancelled", async () => {
    const activeSub = { id: "sub-1", workspaceId: "ws-1", planId: "plan-2", status: "active" };
    mockSubscriptionFindFirst.mockResolvedValue(activeSub);
    mockTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        subscription: { update: vi.fn().mockResolvedValue({ ...activeSub, status: "cancelled" }) },
        workspace: { update: vi.fn().mockResolvedValue({ ...WORKSPACE, subscriptionStatus: "cancelled" }) },
      };
      return await fn(tx);
    });

    const service = new SubscriptionService();
    const result = await service.cancel("ws-1");
    expect(result.status).toBe("cancelled");
  });

  it("checkExpiry returns true when no active subscription", async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);
    const service = new SubscriptionService();
    const expired = await service.checkExpiry("ws-1");
    expect(expired).toBe(true);
  });

  it("downgrade returns scheduled message", async () => {
    mockPlanFindUnique.mockResolvedValue(PLAN_1);
    mockSubscriptionFindFirst.mockResolvedValue({
      id: "sub-1",
      workspaceId: "ws-1",
      planId: "plan-2",
      status: "active",
      plan: PLAN_2,
    });
    const service = new SubscriptionService();
    const result = await service.downgrade("ws-1", "plan-1");
    expect(result.scheduled).toBe(true);
  });
});

describe("Phase 3b — QuotaEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkProjectQuota allows when under limit", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ...WORKSPACE, plan: PLAN_2 });
    mockProjectCount.mockResolvedValue(5);
    const engine = new QuotaEngine();
    const result = await engine.checkProjectQuota("ws-1");
    expect(result.allowed).toBe(true);
  });

  it("checkProjectQuota blocks when at limit", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ...WORKSPACE, plan: PLAN_1 });
    mockProjectCount.mockResolvedValue(5);
    const engine = new QuotaEngine();
    const result = await engine.checkProjectQuota("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("5");
  });

  it("checkProjectQuota uses default limits when no plan", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(WORKSPACE);
    mockProjectCount.mockResolvedValue(4);
    const engine = new QuotaEngine();
    const result = await engine.checkProjectQuota("ws-1");
    expect(result.allowed).toBe(true);
  });

  it("checkProjectQuota blocks at default limit", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(WORKSPACE);
    mockProjectCount.mockResolvedValue(5);
    const engine = new QuotaEngine();
    const result = await engine.checkProjectQuota("ws-1");
    expect(result.allowed).toBe(false);
  });

  it("checkGenerationQuota allows when credits sufficient", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ...WORKSPACE, monthlyCredits: 5000, fuelCredits: 0 });
    const engine = new QuotaEngine();
    const result = await engine.checkGenerationQuota("ws-1", 100);
    expect(result.allowed).toBe(true);
  });

  it("checkGenerationQuota blocks when credits insufficient", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ...WORKSPACE, monthlyCredits: 50, fuelCredits: 0 });
    const engine = new QuotaEngine();
    const result = await engine.checkGenerationQuota("ws-1", 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("积分不足");
  });

  it("checkMemberQuota blocks at limit", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ...WORKSPACE, plan: PLAN_1 });
    mockMemberCount.mockResolvedValue(1);
    const engine = new QuotaEngine();
    const result = await engine.checkMemberQuota("ws-1");
    expect(result.allowed).toBe(false);
  });

  it("checkClientSpaceQuota allows when under limit", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ ...WORKSPACE, plan: PLAN_2 });
    mockClientSpaceCount.mockResolvedValue(3);
    const engine = new QuotaEngine();
    const result = await engine.checkClientSpaceQuota("ws-1");
    expect(result.allowed).toBe(true);
  });

  it("returns not allowed for nonexistent workspace", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(null);
    const engine = new QuotaEngine();
    const result = await engine.checkProjectQuota("nonexistent");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("工作区不存在");
  });
});

describe("Phase 3b — PaymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createOrder generates order with unpaid status", async () => {
    const mockOrder = {
      id: "ord-1",
      orderNo: "ORD-1234567890-abcd",
      workspaceId: "ws-1",
      type: "subscription",
      amount: 399,
      planId: "plan-2",
      fuelPackId: null,
      status: "unpaid",
      paymentMethod: null,
      paidAt: null,
      createdAt: new Date(),
    };
    mockOrderCreate.mockResolvedValue(mockOrder);
    const service = new PaymentService();
    const result = await service.createOrder("ws-1", "subscription", 399, "plan-2");
    expect(result.status).toBe("unpaid");
    expect(result.orderNo).toMatch(/^ORD-/);
  });

  it("confirmPayment marks order as paid", async () => {
    const unpaidOrder = {
      id: "ord-1",
      orderNo: "ORD-1234567890-abcd",
      workspaceId: "ws-1",
      type: "fuel_pack",
      amount: 200,
      planId: null,
      fuelPackId: "fuelpack-2",
      status: "unpaid",
      paymentMethod: null,
      paidAt: null,
    };
    mockOrderFindUnique.mockResolvedValue(unpaidOrder);
    mockFuelPackFindUnique.mockResolvedValue({
      id: "fuelpack-2",
      name: "中加油包",
      credits: 20000,
      price: 200,
      validityDays: 60,
    });
    mockWorkspaceUpdate.mockResolvedValue({ ...WORKSPACE, fuelCredits: 20000 });
    mockOrderUpdate.mockResolvedValue({
      ...unpaidOrder,
      status: "paid",
      paymentMethod: "mock",
      paidAt: new Date(),
    });

    const service = new PaymentService();
    const result = await service.confirmPayment("ORD-1234567890-abcd", "mock");
    expect(result.status).toBe("paid");
    expect(mockWorkspaceUpdate).toHaveBeenCalled();
  });

  it("confirmPayment throws for already paid order", async () => {
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-123",
      status: "paid",
    });
    const service = new PaymentService();
    await expect(service.confirmPayment("ORD-123")).rejects.toThrow("订单状态不允许支付");
  });

  it("confirmPayment throws for nonexistent order", async () => {
    mockOrderFindUnique.mockResolvedValue(null);
    const service = new PaymentService();
    await expect(service.confirmPayment("ORD-404")).rejects.toThrow("订单不存在");
  });
});
