import { prisma } from "@/lib/prisma";

export class TemplateService {
  async createTemplate(data: {
    workspaceId: string;
    name: string;
    type: string;
    platform?: string;
    category?: string;
    sourceProjectId?: string;
    structureSnapshot?: unknown;
    visibility?: string;
  }) {
    const snapshot = JSON.stringify(data.structureSnapshot ?? {});
    const template = await prisma.template.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        type: data.type,
        platform: data.platform ?? "",
        category: data.category ?? "",
        sourceProjectId: data.sourceProjectId,
        structureSnapshot: snapshot,
        visibility: data.visibility ?? "workspace",
      },
    });

    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        structureSnapshot: snapshot,
      },
    });

    return template;
  }

  async createFromProject(projectId: string, name: string, workspaceId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        bundlePlans: {
          include: { bundleSlots: { orderBy: { sequenceOrder: "asc" } } },
        },
      },
    });

    if (!project) {
      throw new Error("项目不存在");
    }

    const structureSnapshot = {
      brandPackId: project.seriesPackId ?? undefined,
      seriesPackId: project.seriesPackId ?? undefined,
      bundlePlans: project.bundlePlans.map((plan) => ({
        platform: plan.platform,
        slots: plan.bundleSlots.map((slot) => ({
          slotType: slot.slotType,
          isAnchor: slot.isAnchor,
          isRequired: slot.isRequired,
          sequenceOrder: slot.sequenceOrder,
        })),
      })),
    };

    return this.createTemplate({
      workspaceId,
      name,
      type: "bundle",
      sourceProjectId: projectId,
      structureSnapshot,
    });
  }

  async listTemplates(
    workspaceId: string,
    filters?: { platform?: string; category?: string; type?: string }
  ) {
    const where: Record<string, unknown> = {
      OR: [{ visibility: "workspace" }, { workspaceId }],
      workspaceId,
    };

    if (filters?.platform) where.platform = filters.platform;
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.type = filters.type;

    return prisma.template.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getTemplate(id: string) {
    return prisma.template.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" } } },
    });
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      structureSnapshot?: unknown;
      platform?: string;
      category?: string;
      visibility?: string;
      changelog?: string;
    }
  ) {
    const template = await prisma.template.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!template) {
      throw new Error("模板不存在");
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;

    const currentSnapshot = template.structureSnapshot;
    const newSnapshot =
      data.structureSnapshot !== undefined
        ? JSON.stringify(data.structureSnapshot)
        : undefined;

    if (newSnapshot !== undefined && newSnapshot !== currentSnapshot) {
      updateData.structureSnapshot = newSnapshot;
      const maxVersion = template.versions[0]?.version ?? 0;
      await prisma.templateVersion.create({
        data: {
          templateId: id,
          version: maxVersion + 1,
          structureSnapshot: newSnapshot,
          changelog: data.changelog ?? "",
        },
      });
    }

    return prisma.template.update({
      where: { id },
      data: updateData,
    });
  }

  async applyTemplate(templateId: string, projectId: string) {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!template) {
      throw new Error("模板不存在");
    }

    const snapshot = JSON.parse(
      template.versions[0]?.structureSnapshot ?? template.structureSnapshot
    );

    if (template.type === "bundle" && snapshot.bundlePlans) {
      for (const planData of snapshot.bundlePlans) {
        const plan = await prisma.bundlePlan.create({
          data: {
            projectId,
            platform: planData.platform,
          },
        });

        if (planData.slots) {
          for (const slotData of planData.slots) {
            await prisma.bundleSlot.create({
              data: {
                bundlePlanId: plan.id,
                slotType: slotData.slotType,
                isAnchor: slotData.isAnchor ?? false,
                isRequired: slotData.isRequired ?? true,
                sequenceOrder: slotData.sequenceOrder,
              },
            });
          }
        }
      }
    }

    await prisma.template.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    return { applied: true, templateId, projectId };
  }
}
