import { NextRequest, NextResponse } from 'next/server'

export interface Session {
  userId: string
  workspaceId: string
  role: string
}

let _authStrictMode = false

export function setAuthStrictMode(strict: boolean) {
  _authStrictMode = strict
}

export function getSessionFromRequest(request: NextRequest): Session | null {
  try {
    const cookie = request.cookies.get('mircioo_session')
    if (!cookie) return null
    const parsed = JSON.parse(cookie.value)
    if (!parsed.userId || !parsed.workspaceId || !parsed.role) return null
    return {
      userId: parsed.userId,
      workspaceId: parsed.workspaceId,
      role: parsed.role,
    }
  } catch {
    return null
  }
}

type RouteHandler = (request: NextRequest, ...args: any[]) => Promise<NextResponse>

export function requireAuth(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, ...args: any[]) => {
    const session = getSessionFromRequest(request)
    if (!session) {
      if (!_authStrictMode) return handler(request, ...args)
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    return handler(request, ...args)
  }
}

export function requireRole(...roles: string[]) {
  return (handler: RouteHandler): RouteHandler => {
    return async (request: NextRequest, ...args: any[]) => {
      const session = getSessionFromRequest(request)
      if (!session) {
        if (!_authStrictMode) return handler(request, ...args)
        return NextResponse.json({ error: '未登录' }, { status: 401 })
      }
      if (!roles.includes(session.role)) {
        return NextResponse.json(
          { error: '权限不足', message: '当前角色不支持此操作' },
          { status: 403 },
        )
      }
      return handler(request, ...args)
    }
  }
}
