import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const task = await prisma.generationTask.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    await prisma.generationTask.update({
      where: { id },
      data: { manualRequired: true },
    });

    return NextResponse.json({ taskId: id, manualRequired: true, action: "marked_manual" });
  } catch (error) {
    return NextResponse.json(
      { error: "标记人工处理失败", message: String(error) },
      { status: 500 },
    );
  }
}
