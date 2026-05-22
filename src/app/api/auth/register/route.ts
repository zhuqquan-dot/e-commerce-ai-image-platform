import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/auth/password";
import { setSession } from "@/auth/session";

const registerSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  password: z.string().min(6, "密码至少6位"),
  name: z.string().min(1, "姓名必填").optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { phone, email, password, name } = parsed.data;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "手机号或邮箱至少提供一个" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该手机号或邮箱已注册" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        phone: phone || null,
        email: email || null,
        passwordHash,
        name,
        status: "active",
      },
    });

    const workspaceId = crypto.randomUUID();

    const workspace = await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: "我的工作区",
        ownerUserId: user.id,
        type: "standard",
      },
    });

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        workspaceId,
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      },
    });

    await setSession({
      userId: user.id,
      workspaceId,
      role: member.role,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          status: user.status,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
          type: workspace.type,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "注册失败", message: String(error) },
      { status: 500 },
    );
  }
}
