import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    const exportPacks = await prisma.exportPack.findMany({
      where: { projectId: id },
      include: {
        manifest: {
          select: { id: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const list = exportPacks.map((ep) => ({
      id: ep.id,
      createdAt: ep.createdAt,
      exportScope: ep.exportScope,
      status: ep.status,
      fileCount: ep.fileCount,
      manifestSummary:
        ep.manifest.length > 0
          ? {
              manifestId: ep.manifest[0].id,
              manifestCreatedAt: ep.manifest[0].createdAt,
            }
          : null,
    }))

    return NextResponse.json({
      projectId: id,
      exportHistory: list,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "查询导出历史失败", message: String(error) },
      { status: 500 },
    )
  }
}
