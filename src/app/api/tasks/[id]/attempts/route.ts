import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const task = await prisma.generationTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    const attempts = await prisma.generationAttempt.findMany({
      where: { taskId: id },
      include: {
        candidateAssets: {
          select: { imageUrl: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const list = attempts.map((a) => {
      let promptVersion: string | null = null
      try {
        if (a.generationSpec) {
          const spec = JSON.parse(a.generationSpec)
          promptVersion = spec.promptVersion ?? null
        }
      } catch {}
      return {
        id: a.id,
        createdAt: a.createdAt,
        providerConfigId: a.providerConfigId,
        status: a.status,
        generationSpec: a.generationSpec,
        promptText: a.promptText,
        promptVersion,
        errorMessage: a.errorMessage,
        thumbnailUrl: a.candidateAssets[0]?.imageUrl ?? null,
      }
    })

    return NextResponse.json({
      taskId: id,
      attempts: list,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "查询历史记录失败", message: String(error) },
      { status: 500 },
    )
  }
}
