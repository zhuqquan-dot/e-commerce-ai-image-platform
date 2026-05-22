import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/auth/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const membership = await prisma.member.findFirst({
      where: { userId: session.userId, workspaceId: id, status: "active" },
    });

    if (!membership) {
      return NextResponse.json({ error: "无权访问该工作空间" }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "工作空间不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      owner: workspace.owner,
      role: membership.role,
      memberCount: workspace._count.members,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询工作空间失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    const membership = await prisma.member.findFirst({
      where: { userId: session.userId, workspaceId: id, status: "active" },
    });

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "仅 owner 或 admin 可修改工作空间" }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "工作空间名称不能为空" }, { status: 400 });
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      memberCount: workspace._count.members,
      updatedAt: workspace.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "更新工作空间失败", message: String(error) },
      { status: 500 }
    );
  }
}
