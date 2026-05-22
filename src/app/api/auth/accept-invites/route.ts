import { NextResponse } from "next/server";
import { getSession } from "@/auth/session";
import { acceptPendingInvites } from "@/auth/invite";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const count = await acceptPendingInvites(session.userId);

    return NextResponse.json({ accepted: count });
  } catch (error) {
    return NextResponse.json(
      { error: "接受邀请失败", message: String(error) },
      { status: 500 }
    );
  }
}
