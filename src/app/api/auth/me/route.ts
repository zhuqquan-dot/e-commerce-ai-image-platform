import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/auth/session";

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 401 },
      );
    }

    const memberships = await prisma.member.findMany({
      where: { userId: user.id, status: "active" },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const currentWorkspace = memberships.find(
      (m) => m.workspaceId === session.workspaceId,
    );

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      currentWorkspace: currentWorkspace
        ? {
            id: currentWorkspace.workspace.id,
            name: currentWorkspace.workspace.name,
            role: currentWorkspace.role,
          }
        : null,
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "获取用户信息失败", message: String(error) },
      { status: 500 },
    );
  }
}
