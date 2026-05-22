import { prisma } from "@/lib/prisma";
import { checkPluginPermission } from "./plugin-security-guard";

export type LifecycleHook =
  | "export:before"
  | "export:after"
  | "generation:after"
  | "review:after";

export async function dispatchHook(
  hookName: LifecycleHook,
  _context: Record<string, unknown>
): Promise<void> {
  const plugins = await prisma.pluginRegistry.findMany({
    where: { status: "active" },
  });

  for (const plugin of plugins) {
    const hooks: string[] = JSON.parse(plugin.lifecycleHooks);
    if (!hooks.includes(hookName)) continue;

    const hasPermission = checkPluginPermission(plugin, `${hookName}:execute`);
    if (!hasPermission) continue;

    try {
      await prisma.pluginRegistry.update({
        where: { id: plugin.id },
        data: { lastExecutedAt: new Date() },
      });
    } catch {}
  }
}
