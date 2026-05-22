export type Role = 'owner' | 'admin' | 'operator' | 'reviewer' | 'viewer' | 'client_viewer'

export type PermissionAction =
  | 'project:create'
  | 'project:read'
  | 'product:write'
  | 'product:read'
  | 'task:review'
  | 'task:retry'
  | 'export:create'
  | 'export:read'
  | 'client_space:write'
  | 'brand_pack:write'
  | 'series_pack:write'
  | 'member:manage'
  | 'workspace:manage'

export const ROLE_PERMISSIONS: Record<Role, PermissionAction[]> = {
  owner: [
    'project:create', 'project:read',
    'product:write', 'product:read',
    'task:review', 'task:retry',
    'export:create', 'export:read',
    'client_space:write', 'brand_pack:write', 'series_pack:write',
    'member:manage', 'workspace:manage',
  ],
  admin: [
    'project:create', 'project:read',
    'product:write', 'product:read',
    'task:review', 'task:retry',
    'export:create', 'export:read',
    'client_space:write', 'brand_pack:write', 'series_pack:write',
    'member:manage', 'workspace:manage',
  ],
  operator: [
    'project:create', 'project:read',
    'product:write', 'product:read',
    'task:retry',
    'export:create', 'export:read',
    'client_space:write', 'brand_pack:write', 'series_pack:write',
  ],
  reviewer: [
    'project:read',
    'product:read',
    'task:review',
    'export:create', 'export:read',
  ],
  viewer: [
    'project:read',
    'product:read',
    'export:read',
  ],
  client_viewer: [
    'project:read',
    'product:read',
    'export:read',
  ],
}

export function hasPermission(role: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role]
  if (!permissions) return false
  return permissions.includes(action as PermissionAction)
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: '拥有者',
  admin: '管理员',
  operator: '操作员',
  reviewer: '审核员',
  viewer: '观察者',
  client_viewer: '客户查看者',
}
