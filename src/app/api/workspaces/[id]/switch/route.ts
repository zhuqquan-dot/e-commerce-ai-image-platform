import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, setSession } from "@/auth/session";

export async function POST(
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

    await setSession({
      userId: session.userId,
      workspaceId: id,
      role: membership.role,
    });

    return NextResponse.json({ success: true, workspaceId: id, role: membership.role });
  } catch (error) {
    return NextResponse.json(
      { error: "切换工作空间失败", message: String(error) },
      { status: 500 }
    );
  }
}
