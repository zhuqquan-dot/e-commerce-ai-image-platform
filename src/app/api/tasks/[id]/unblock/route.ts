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
    if (task.status !== "blocked") {
      return NextResponse.json(
        { error: "只能解封 blocked 状态的任务", taskId: id, currentStatus: task.status },
        { status: 400 },
      );
    }

    await prisma.generationTask.update({
      where: { id },
      data: { status: "pending" },
    });

    return NextResponse.json({ taskId: id, status: "pending", action: "unblocked" });
  } catch (error) {
    return NextResponse.json(
      { error: "解封任务失败", message: String(error) },
      { status: 500 },
    );
  }
}
