import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/auth/api-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientSpaceId: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    const { clientSpaceId } = await params;

    const clientSpace = await prisma.clientSpace.findUnique({
      where: { id: clientSpaceId },
    });

    if (!clientSpace) {
      return NextResponse.json({ error: "客户空间不存在" }, { status: 404 });
    }

    if (session?.workspaceId && clientSpace.workspaceId !== session.workspaceId) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const projects = await prisma.project.findMany({
      where: { clientSpaceId },
      select: {
        id: true,
        projectType: true,
        selectedPlatforms: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const projectIds = projects.map((p) => p.id);

    const approvedTasks = projectIds.length > 0
      ? await prisma.generationTask.findMany({
          where: {
            projectId: { in: projectIds },
            status: "approved",
          },
          select: {
            id: true,
            projectId: true,
            slotCode: true,
            status: true,
            createdAt: true,
            platformRulePack: {
              select: { platformName: true },
            },
            candidateAssets: {
              select: {
                id: true,
                imageUrl: true,
                format: true,
                fileSizeBytes: true,
              },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
            reviewRecords: {
              where: { action: "approved" },
              select: { createdAt: true, reviewerId: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const exportPacks = projectIds.length > 0
      ? await prisma.exportPack.findMany({
          where: { projectId: { in: projectIds } },
          select: {
            id: true,
            projectId: true,
            status: true,
            fileCount: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return NextResponse.json({
      clientSpace: {
        id: clientSpace.id,
        clientName: clientSpace.clientName,
        brandName: clientSpace.brandName,
        region: clientSpace.region,
      },
      projects: projects.map((p) => ({
        ...p,
        selectedPlatforms: (() => {
          try { return JSON.parse(p.selectedPlatforms as string || "[]"); }
          catch { return []; }
        })(),
      })),
      tasks: approvedTasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        platform: t.platformRulePack?.platformName ?? "",
        slotCode: t.slotCode,
        imageUrl: t.candidateAssets[0]?.imageUrl ?? null,
        format: t.candidateAssets[0]?.format ?? null,
        fileSize: t.candidateAssets[0]?.fileSizeBytes ?? null,
        approvedAt: t.reviewRecords[0]?.createdAt ?? null,
      })),
      exportPacks: exportPacks.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        status: e.status,
        fileCount: e.fileCount,
        fileUrl: e.fileUrl,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询交付数据失败", message: String(error) },
      { status: 500 }
    );
  }
}
