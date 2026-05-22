export function checkPluginPermission(
  plugin: { requiredPermissions: string },
  action: string
): boolean {
  const permissions: string[] = JSON.parse(plugin.requiredPermissions);
  return permissions.some(
    (p) => action.startsWith(p.split(":")[0] + ":") || p === action
  );
}
