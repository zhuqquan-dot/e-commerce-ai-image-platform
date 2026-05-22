import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/auth/password";
import { setSession } from "@/auth/session";

const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  password: z.string().min(1, "密码必填"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { phone, email, password } = parsed.data;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "手机号或邮箱至少提供一个" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "账号不存在" },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "密码错误" },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const memberships = await prisma.member.findMany({
      where: { userId: user.id, status: "active" },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const defaultMembership = memberships[0];
    if (defaultMembership) {
      await setSession({
        userId: user.id,
        workspaceId: defaultMembership.workspaceId,
        role: defaultMembership.role,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "登录失败", message: String(error) },
      { status: 500 },
    );
  }
}
