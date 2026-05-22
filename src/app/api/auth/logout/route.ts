import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/auth/session";

export async function POST(_request?: NextRequest) {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "登出失败", message: String(error) },
      { status: 500 },
    );
  }
}
