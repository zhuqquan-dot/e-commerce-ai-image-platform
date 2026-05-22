import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createId, setSession } from "@/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const memberships = await prisma.member.findMany({
      where: { userId: session.userId, status: "active" },
      include: { workspace: { select: { id: true, name: true, _count: { select: { members: true } } } } },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      memberCount: m.workspace._count.members,
    }));

    return NextResponse.json(workspaces);
  } catch (error) {
    return NextResponse.json(
      { error: "查询工作空间失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "工作空间名称不能为空" }, { status: 400 });
    }

    const workspaceId = createId();

    const workspace = await prisma.workspace.create({
      data: {
        id: workspaceId,
        name,
        ownerUserId: session.userId,
        type: "standard",
        members: {
          create: {
            userId: session.userId,
            role: "owner",
            status: "active",
            joinedAt: new Date(),
          },
        },
      },
      include: { _count: { select: { members: true } } },
    });

    await setSession({
      userId: session.userId,
      workspaceId: workspace.id,
      role: "owner",
    });

    return NextResponse.json(
      {
        id: workspace.id,
        name: workspace.name,
        role: "owner",
        memberCount: workspace._count.members,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "创建工作空间失败", message: String(error) },
      { status: 500 }
    );
  }
}
