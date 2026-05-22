import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const exportPack = await prisma.exportPack.findUnique({
      where: { id },
      select: { fileUrl: true, status: true, id: true },
    })

    if (!exportPack) {
      return NextResponse.json(
        { error: '导出记录不存在' },
        { status: 404 },
      )
    }

    if (exportPack.status !== 'completed') {
      return NextResponse.json(
        { error: '导出尚未完成' },
        { status: 400 },
      )
    }

    if (!exportPack.fileUrl) {
      return NextResponse.json(
        { error: '导出文件不存在' },
        { status: 404 },
      )
    }

    const filePath = exportPack.fileUrl
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'ZIP文件未找到，可能已被清理' },
        { status: 404 },
      )
    }

    const stat = fs.statSync(filePath)
    const fileName = `export_${exportPack.id}.zip`

    const fileStream = fs.createReadStream(filePath)
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk as Buffer))
        })
        fileStream.on('end', () => {
          controller.close()
        })
        fileStream.on('error', (err: Error) => {
          controller.error(err)
        })
      },
    })

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(stat.size),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: '下载失败', message },
      { status: 500 },
    )
  }
}
