import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getSessionFromRequest,
  requireAuth,
  requireRole,
  setAuthStrictMode,
} from '@/auth/api-guard'
import { hasPermission, ROLE_LABELS } from '@/auth/permissions'

function makeRequest(options?: {
  session?: { userId: string; workspaceId: string; role: string }
  body?: Record<string, unknown>
  method?: string
}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options?.session) {
    headers['Cookie'] = `mircioo_session=${encodeURIComponent(JSON.stringify(options.session))}`
  }
  return new NextRequest('http://localhost/api/test', {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}

describe('getSessionFromRequest', () => {
  it('当没有 cookie 时返回 null', () => {
    const req = makeRequest()
    expect(getSessionFromRequest(req)).toBeNull()
  })

  it('当 cookie 值不是合法 JSON 时返回 null', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Cookie: 'mircioo_session=not-json' },
    })
    expect(getSessionFromRequest(req)).toBeNull()
  })

  it('当 cookie 字段不全时返回 null', () => {
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: '', role: '' },
    })
    expect(getSessionFromRequest(req)).toBeNull()
  })

  it('正确解析有效的 session cookie', () => {
    const session = { userId: 'user-1', workspaceId: 'ws-1', role: 'operator' }
    const req = makeRequest({ session })
    const result = getSessionFromRequest(req)
    expect(result).toEqual(session)
  })
})

describe('hasPermission', () => {
  it('owner 拥有所有权限', () => {
    expect(hasPermission('owner', 'project:create')).toBe(true)
    expect(hasPermission('owner', 'project:read')).toBe(true)
    expect(hasPermission('owner', 'product:write')).toBe(true)
    expect(hasPermission('owner', 'task:review')).toBe(true)
    expect(hasPermission('owner', 'task:retry')).toBe(true)
    expect(hasPermission('owner', 'export:create')).toBe(true)
    expect(hasPermission('owner', 'member:manage')).toBe(true)
    expect(hasPermission('owner', 'workspace:manage')).toBe(true)
  })

  it('operator 可以创建项目但不能审核', () => {
    expect(hasPermission('operator', 'project:create')).toBe(true)
    expect(hasPermission('operator', 'task:retry')).toBe(true)
    expect(hasPermission('operator', 'task:review')).toBe(false)
    expect(hasPermission('operator', 'member:manage')).toBe(false)
    expect(hasPermission('operator', 'workspace:manage')).toBe(false)
  })

  it('reviewer 可以审核但不能修改商品', () => {
    expect(hasPermission('reviewer', 'task:review')).toBe(true)
    expect(hasPermission('reviewer', 'export:create')).toBe(true)
    expect(hasPermission('reviewer', 'product:write')).toBe(false)
    expect(hasPermission('reviewer', 'project:create')).toBe(false)
    expect(hasPermission('reviewer', 'task:retry')).toBe(false)
    expect(hasPermission('reviewer', 'member:manage')).toBe(false)
  })

  it('viewer 只能读取', () => {
    expect(hasPermission('viewer', 'project:read')).toBe(true)
    expect(hasPermission('viewer', 'product:read')).toBe(true)
    expect(hasPermission('viewer', 'export:read')).toBe(true)
    expect(hasPermission('viewer', 'project:create')).toBe(false)
    expect(hasPermission('viewer', 'product:write')).toBe(false)
    expect(hasPermission('viewer', 'task:review')).toBe(false)
    expect(hasPermission('viewer', 'task:retry')).toBe(false)
    expect(hasPermission('viewer', 'export:create')).toBe(false)
    expect(hasPermission('viewer', 'member:manage')).toBe(false)
  })

  it('client_viewer 只能读取，不能写', () => {
    expect(hasPermission('client_viewer', 'project:read')).toBe(true)
    expect(hasPermission('client_viewer', 'export:read')).toBe(true)
    expect(hasPermission('client_viewer', 'project:create')).toBe(false)
    expect(hasPermission('client_viewer', 'product:write')).toBe(false)
    expect(hasPermission('client_viewer', 'task:review')).toBe(false)
    expect(hasPermission('client_viewer', 'task:retry')).toBe(false)
    expect(hasPermission('client_viewer', 'export:create')).toBe(false)
    expect(hasPermission('client_viewer', 'client_space:write')).toBe(false)
    expect(hasPermission('client_viewer', 'brand_pack:write')).toBe(false)
    expect(hasPermission('client_viewer', 'series_pack:write')).toBe(false)
  })

  it('不存在的角色返回 false', () => {
    expect(hasPermission('nonexistent', 'project:read')).toBe(false)
  })
})

describe('ROLE_LABELS', () => {
  it('所有角色都有中文标签', () => {
    expect(ROLE_LABELS.owner).toBe('拥有者')
    expect(ROLE_LABELS.admin).toBe('管理员')
    expect(ROLE_LABELS.operator).toBe('操作员')
    expect(ROLE_LABELS.reviewer).toBe('审核员')
    expect(ROLE_LABELS.viewer).toBe('观察者')
    expect(ROLE_LABELS.client_viewer).toBe('客户查看者')
  })
})

describe('requireAuth guard (非严格模式，默认)', () => {
  const handler = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  const wrapped = requireAuth(handler)

  it('无 session 时放行请求', async () => {
    const req = makeRequest()
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })

  it('有 session 时放行请求', async () => {
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'viewer' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })
})

describe('requireAuth guard (严格模式)', () => {
  const handler = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  const wrapped = requireAuth(handler)

  beforeEach(() => {
    setAuthStrictMode(true)
  })

  it('无 session 时返回 401', async () => {
    const req = makeRequest()
    const res = await wrapped(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('未登录')
  })

  it('有 session 时放行', async () => {
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'viewer' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })
})

describe('requireRole guard', () => {
  const handler = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  beforeEach(() => {
    setAuthStrictMode(false)
  })

  it('角色匹配时放行', async () => {
    const wrapped = requireRole('owner', 'admin')(handler)
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'admin' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })

  it('角色不匹配时返回 403', async () => {
    const wrapped = requireRole('owner', 'admin')(handler)
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'viewer' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('权限不足')
    expect(body.message).toBe('当前角色不支持此操作')
  })

  it('无 session 且非严格模式时放行', async () => {
    const wrapped = requireRole('owner')(handler)
    const req = makeRequest()
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })

  it('无 session 且严格模式时返回 401', async () => {
    setAuthStrictMode(true)
    const wrapped = requireRole('owner')(handler)
    const req = makeRequest()
    const res = await wrapped(req)
    expect(res.status).toBe(401)
    setAuthStrictMode(false)
  })
})

describe('组合 requireAuth + requireRole', () => {
  const handler = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

  beforeEach(() => {
    setAuthStrictMode(false)
  })

  it('owner 可以通过 project:create 权限检查', async () => {
    const wrapped = requireAuth(requireRole('owner', 'admin', 'operator')(handler))
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'owner' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })

  it('viewer 被 project:create 权限拒绝', async () => {
    const wrapped = requireAuth(requireRole('owner', 'admin', 'operator')(handler))
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'viewer' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(403)
  })

  it('reviewer 可以通过审核权限检查', async () => {
    const wrapped = requireAuth(requireRole('owner', 'admin', 'reviewer')(handler))
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'reviewer' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(200)
  })

  it('client_viewer 被所有写操作权限拒绝', async () => {
    const wrapped = requireAuth(requireRole('owner', 'admin', 'operator')(handler))
    const req = makeRequest({
      session: { userId: 'u1', workspaceId: 'ws-1', role: 'client_viewer' },
    })
    const res = await wrapped(req)
    expect(res.status).toBe(403)
  })
})
