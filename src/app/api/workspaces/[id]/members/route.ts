import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/auth/session";
import { hashPassword } from "@/auth/password";
import { QuotaEngine } from "@/commerce/quota-engine";

const ROLE_PRIORITY: Record<string, number> = {
  owner: 0,
  admin: 1,
  operator: 2,
  reviewer: 3,
  viewer: 4,
  client_viewer: 5,
};

const VALID_ROLES = ["owner", "admin", "operator", "reviewer", "viewer", "client_viewer"];

function compareByRole(a: { role: string; joinedAt: Date | null }, b: { role: string; joinedAt: Date | null }): number {
  const pa = ROLE_PRIORITY[a.role] ?? 99;
  const pb = ROLE_PRIORITY[b.role] ?? 99;
  if (pa !== pb) return pa - pb;
  const ja = a.joinedAt?.getTime() ?? 0;
  const jb = b.joinedAt?.getTime() ?? 0;
  return ja - jb;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: workspaceId } = await params;
    if (session.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "无权访问该工作区" }, { status: 403 });
    }

    const isOwnerOrAdmin = session.role === "owner" || session.role === "admin";

    const members = await prisma.member.findMany({
      where: {
        workspaceId,
        status: isOwnerOrAdmin ? { in: ["active", "invited"] } : "active",
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    const sorted = members
      .map((m) => ({
        id: m.id,
        userId: m.userId,
        workspaceId: m.workspaceId,
        role: m.role,
        status: m.status,
        invitedBy: m.invitedBy,
        joinedAt: m.joinedAt,
        name: m.user.name,
        phone: m.user.phone,
        email: m.user.email,
        workspaceOwnerId: "",
      }))
      .sort(compareByRole);

    return NextResponse.json({ list: sorted });
  } catch (error) {
    return NextResponse.json(
      { error: "获取成员列表失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json({ error: "无权限邀请成员" }, { status: 403 });
    }

    const { id: workspaceId } = await params;
    if (session.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "无权操作该工作区" }, { status: 403 });
    }

    const quotaEngine = new QuotaEngine();
    const quotaCheck = await quotaEngine.checkMemberQuota(workspaceId);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { phone, email, role } = body as { phone?: string; email?: string; role?: string };

    if (!phone && !email) {
      return NextResponse.json({ error: "请提供手机号或邮箱" }, { status: 400 });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    if (role === "owner") {
      return NextResponse.json({ error: "不能邀请为 owner 角色" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!user) {
      const placeholderHash = await hashPassword(Math.random().toString(36).slice(2));
      user = await prisma.user.create({
        data: {
          phone: phone ?? null,
          email: email ?? null,
          passwordHash: placeholderHash,
          name: phone ?? email ?? "",
        },
      });
    }

    const existing = await prisma.member.findFirst({
      where: { userId: user.id, workspaceId },
    });

    if (existing) {
      if (existing.status === "removed") {
        await prisma.member.update({
          where: { id: existing.id },
          data: { status: "invited", role, invitedBy: session.userId },
        });
        return NextResponse.json({
          id: existing.id,
          userId: user.id,
          workspaceId,
          role,
          status: "invited",
          invitedBy: session.userId,
          joinedAt: null,
          name: user.name,
          phone: user.phone,
          email: user.email,
        });
      }
      return NextResponse.json({
        id: existing.id,
        userId: user.id,
        workspaceId,
        role: existing.role,
        status: existing.status,
        invitedBy: existing.invitedBy,
        joinedAt: existing.joinedAt,
        name: user.name,
        phone: user.phone,
        email: user.email,
      });
    }

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
        status: "invited",
        invitedBy: session.userId,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    return NextResponse.json({
      id: member.id,
      userId: member.userId,
      workspaceId: member.workspaceId,
      role: member.role,
      status: member.status,
      invitedBy: member.invitedBy,
      joinedAt: member.joinedAt,
      name: member.user.name,
      phone: member.user.phone,
      email: member.user.email,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "邀请成员失败", message: String(error) },
      { status: 500 }
    );
  }
}
