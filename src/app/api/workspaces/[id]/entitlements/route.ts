import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getSessionFromRequest } from '@/auth/api-guard'
import { EntitlementController } from '@/commerce/entitlement-controller'

const entitlementController = new EntitlementController()

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSessionFromRequest(_request)
    const { id: workspaceId } = await params

    if (session?.workspaceId && session.workspaceId !== workspaceId) {
      return NextResponse.json({ error: '无权访问该工作空间' }, { status: 403 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: '工作空间不存在' }, { status: 404 })
    }

    const entitlements = await entitlementController.getWorkspaceEntitlements(workspaceId)

    return NextResponse.json(entitlements)
  } catch (error) {
    return NextResponse.json(
      { error: '查询工作空间权益失败', message: String(error) },
      { status: 500 },
    )
  }
}

export const GET = requireAuth(handleGET)
