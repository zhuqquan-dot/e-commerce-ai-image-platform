import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, getSessionFromRequest } from "@/auth/api-guard";
import { SubscriptionService } from "@/commerce/subscription-service";

const subscriptionService = new SubscriptionService();

const subscribeSchema = z.object({
  planId: z.string().min(1),
  period: z.enum(["monthly", "yearly"]),
});

const changeSchema = z.object({
  action: z.enum(["upgrade", "downgrade", "renew"]),
  planId: z.string().optional(),
});

async function verifyWorkspaceAccess(
  request: NextRequest,
  workspaceId: string,
  minRole?: string,
) {
  const session = getSessionFromRequest(request);
  if (!session) return null;

  const membership = await prisma.member.findFirst({
    where: { userId: session.userId, workspaceId, status: "active" },
  });
  if (!membership) return null;

  if (minRole) {
    const rolePriority: Record<string, number> = {
      owner: 0,
      admin: 1,
      operator: 2,
      reviewer: 3,
      viewer: 4,
    };
    if ((rolePriority[membership.role] ?? 99) > (rolePriority[minRole] ?? 99)) {
      return null;
    }
  }

  return { session, membership };
}

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const auth = await verifyWorkspaceAccess(request, workspaceId);
    if (!auth) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const subscription = await subscriptionService.getActiveSubscription(workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        planId: true,
        monthlyCredits: true,
        fuelCredits: true,
        subscriptionStatus: true,
        quotaResetAt: true,
      },
    });

    return NextResponse.json({
      subscription,
      workspace: workspace ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询订阅失败", message: String(error) },
      { status: 500 },
    );
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const auth = await verifyWorkspaceAccess(request, workspaceId, "owner");
    if (!auth) {
      return NextResponse.json({ error: "仅 owner 可创建订阅" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const subscription = await subscriptionService.subscribe(
      workspaceId,
      parsed.data.planId,
      parsed.data.period,
    );

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "创建订阅失败", message },
      { status: 500 },
    );
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;
    const auth = await verifyWorkspaceAccess(request, workspaceId, "owner");
    if (!auth) {
      return NextResponse.json({ error: "仅 owner 可变更订阅" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = changeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { action, planId } = parsed.data;

    if (action === "upgrade") {
      if (!planId) {
        return NextResponse.json(
          { error: "升级需要指定目标套餐" },
          { status: 400 },
        );
      }
      const subscription = await subscriptionService.upgrade(workspaceId, planId);
      return NextResponse.json({ subscription });
    }

    if (action === "downgrade") {
      if (!planId) {
        return NextResponse.json(
          { error: "降级需要指定目标套餐" },
          { status: 400 },
        );
      }
      const result = await subscriptionService.downgrade(workspaceId, planId);
      return NextResponse.json({ result });
    }

    if (action === "renew") {
      const subscription = await subscriptionService.renew(workspaceId);
      return NextResponse.json({ subscription });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "变更订阅失败", message },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);
export const POST = requireAuth(requireRole("owner", "admin")(handlePOST));
export const PUT = requireAuth(requireRole("owner")(handlePUT));
