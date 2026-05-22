import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 })
    }

    const projects = await prisma.project.findMany({
      where: { productId: id },
      include: {
        bundlePlans: {
          include: {
            bundleSlots: {
              select: { warnings: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const planHistory = projects.flatMap((p) =>
      p.bundlePlans.map((bp) => {
        const allWarnings = bp.bundleSlots.flatMap((s) => {
          try {
            return JSON.parse(s.warnings || "[]") as string[]
          } catch {
            return []
          }
        })
        return {
          projectId: p.id,
          projectName: product.productName,
          platform: bp.platform,
          slotCount: bp.bundleSlots.length,
          createdAt: bp.createdAt,
          warnings: allWarnings,
        }
      }),
    )

    return NextResponse.json({
      productId: id,
      planHistory,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "查询规划历史失败", message: String(error) },
      { status: 500 },
    )
  }
}
