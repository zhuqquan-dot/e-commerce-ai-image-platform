import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/auth/session";

const VALID_ROLES = ["owner", "admin", "operator", "reviewer", "viewer", "client_viewer"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (session.role !== "owner") {
      return NextResponse.json({ error: "只有 owner 可以修改成员角色" }, { status: 403 });
    }

    const { id: workspaceId, memberId } = await params;
    if (session.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "无权操作该工作区" }, { status: 403 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    });

    if (!member || member.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { role } = body as { role?: string };

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    if (member.role === "owner" && role !== "owner") {
      return NextResponse.json({ error: "不能修改 owner 的角色" }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      workspaceId: updated.workspaceId,
      role: updated.role,
      status: updated.status,
      invitedBy: updated.invitedBy,
      joinedAt: updated.joinedAt,
      name: updated.user.name,
      phone: updated.user.phone,
      email: updated.user.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "修改角色失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json({ error: "无权限移除成员" }, { status: 403 });
    }

    const { id: workspaceId, memberId } = await params;
    if (session.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "无权操作该工作区" }, { status: 403 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    if (member.role === "owner") {
      return NextResponse.json({ error: "不能移除 owner" }, { status: 400 });
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { status: "removed" },
    });

    return NextResponse.json({ id: memberId, status: "removed" });
  } catch (error) {
    return NextResponse.json(
      { error: "移除成员失败", message: String(error) },
      { status: 500 }
    );
  }
}
