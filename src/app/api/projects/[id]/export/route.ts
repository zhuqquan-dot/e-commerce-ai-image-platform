import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ExportBuilder } from '@/delivery/export-builder'
import { requireAuth, requireRole } from '@/auth/api-guard'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { scope, scopeValue } = body as {
      scope?: string
      scopeValue?: string
    }

    if (!scope || !['project', 'platform', 'product'].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be: project, platform, or product' },
        { status: 400 },
      )
    }

    if ((scope === 'platform' || scope === 'product') && !scopeValue) {
      return NextResponse.json(
        { error: `scopeValue is required when scope is "${scope}"` },
        { status: 400 },
      )
    }

    const builder = new ExportBuilder()
    const result = await builder.export(
      projectId,
      scope as 'project' | 'platform' | 'product',
      scopeValue,
    )

    return NextResponse.json(
      {
        exportPackId: result.exportPackId,
        fileUrl: `/api/exports/${result.exportPackId}/download`,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: '导出失败', message },
      { status: 500 },
    )
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'operator', 'reviewer')(handlePOST));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const info = searchParams.get('info')

    if (info === 'platforms') {
      const tasks = await prisma.generationTask.findMany({
        where: { projectId, status: 'approved' },
        include: {
          platformRulePack: { select: { platformName: true } },
        },
      })

      const platforms = Array.from(
        new Map(
          tasks.map((t) => [
            t.platformRulePack?.platformName || 'UNKNOWN',
            {
              platform: t.platformRulePack?.platformName || 'UNKNOWN',
              taskCount: 0,
            },
          ]),
        ).values(),
      )

      for (const p of platforms) {
        p.taskCount = tasks.filter(
          (t) =>
            (t.platformRulePack?.platformName || 'UNKNOWN') === p.platform,
        ).length
      }

      return NextResponse.json({ platforms }, { status: 200 })
    }

    const exports = await prisma.exportPack.findMany({
      where: { projectId },
      include: {
        mappings: true,
        manifest: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const list = exports.map((ep) => ({
      id: ep.id,
      exportScope: ep.exportScope,
      platformPackId: ep.platformPackId,
      status: ep.status,
      fileCount: ep.fileCount,
      fileUrl: ep.fileUrl,
      generatedAt: ep.generatedAt,
      createdAt: ep.createdAt,
      downloadUrl: `/api/exports/${ep.id}/download`,
      mappingCount: ep.mappings.length,
    }))

    return NextResponse.json({ exports: list }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: '查询导出记录失败', message },
      { status: 500 },
    )
  }
}
