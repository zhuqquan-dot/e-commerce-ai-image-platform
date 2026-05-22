import { prisma } from "@/lib/prisma";

export class PluginRegistryService {
  async registerPlugin(data: {
    name: string;
    description?: string;
    entryRoute?: string;
    lifecycleHooks?: string[];
    requiredPermissions?: string[];
    version?: string;
  }) {
    return prisma.pluginRegistry.create({
      data: {
        name: data.name,
        description: data.description ?? "",
        entryRoute: data.entryRoute ?? "",
        lifecycleHooks: JSON.stringify(data.lifecycleHooks ?? []),
        requiredPermissions: JSON.stringify(data.requiredPermissions ?? []),
        status: "inactive",
        version: data.version ?? "1.0.0",
      },
    });
  }

  async listPlugins() {
    return prisma.pluginRegistry.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async enablePlugin(id: string) {
    return prisma.pluginRegistry.update({
      where: { id },
      data: { status: "active" },
    });
  }

  async disablePlugin(id: string) {
    return prisma.pluginRegistry.update({
      where: { id },
      data: { status: "inactive" },
    });
  }

  async removePlugin(id: string) {
    return prisma.pluginRegistry.delete({
      where: { id },
    });
  }
}
