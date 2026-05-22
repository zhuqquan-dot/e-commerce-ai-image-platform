import { prisma } from '@/lib/prisma'
import { NamingMapper } from './naming-mapper'
import { exportRuleRegistry, ExportNamingRule } from './export-rule-registry'
import { dispatchHook } from '@/ecosystem/plugin-hook-dispatcher'
import { ZipArchive } from 'archiver'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'exports')

interface ManifestItem {
  fileName: string
  originalFile: string
  slotType: string
  platform: string
  productName: string
  qcGrade: string
  reviewAction: string | null
  reviewComment: string | null
}

interface ManifestData {
  projectId: string
  scope: string
  exportTime: string
  items: ManifestItem[]
  risks: string[]
}

export class ExportBuilder {
  async export(
    projectId: string,
    scope: 'project' | 'platform' | 'product',
    scopeValue?: string,
  ): Promise<{ exportPackId: string; filePath: string }> {
    const where: Record<string, unknown> = {
      projectId,
      status: 'approved',
    }

    if (scope === 'platform' && scopeValue) {
      const rulePack = await prisma.platformRulePack.findUnique({
        where: { platformName: scopeValue },
      })
      if (!rulePack) {
        throw new Error(`Platform "${scopeValue}" not found`)
      }
      where.platformPackId = rulePack.id
    }

    if (scope === 'product' && scopeValue) {
      where.productId = scopeValue
    }

    const tasks = await prisma.generationTask.findMany({
      where,
      include: {
        attempts: {
          where: { status: 'succeeded' },
          include: { candidateAssets: true },
          orderBy: { createdAt: 'desc' },
        },
        qcResults: { take: 1, orderBy: { createdAt: 'desc' } },
        reviewRecords: { take: 1, orderBy: { createdAt: 'desc' } },
        product: true,
        platformRulePack: { select: { platformName: true } },
      },
    })

    if (tasks.length === 0) {
      throw new Error('No approved assets to export')
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { productId: true },
    })
    const product = await prisma.product.findUnique({
      where: { id: project?.productId },
      select: { clientSpaceId: true },
    })

    const exportPack = await prisma.exportPack.create({
      data: {
        projectId,
        clientSpaceId: product?.clientSpaceId || '',
        exportScope: scope,
        platformPackId: scope === 'platform' ? scopeValue || null : null,
        status: 'generating',
        fileCount: 0,
      },
    })

    const manifestData: ManifestData = {
      projectId,
      scope,
      exportTime: new Date().toISOString(),
      items: [],
      risks: [],
    }

    const outputDir = path.join(STORAGE_DIR, exportPack.id)
    fs.mkdirSync(outputDir, { recursive: true })

    let index = 0
    let fileCount = 0

    for (const task of tasks) {
      const latestAttempt = task.attempts[0]
      if (!latestAttempt) {
        manifestData.risks.push(
          `Task ${task.id}: No succeeded attempt found for slot "${task.slotCode}"`,
        )
        continue
      }

      for (const asset of latestAttempt.candidateAssets) {
        if (!asset.localPath || !fs.existsSync(asset.localPath)) {
          manifestData.risks.push(
            `Asset ${asset.id}: localPath "${asset.localPath}" not found on disk`,
          )
          continue
        }

        const ext = (asset.format || 'jpg').toLowerCase()
        const platformName = task.platformRulePack?.platformName || 'UNKNOWN'
        const productName = task.product?.productName || 'product'
        const baseName = NamingMapper.formatFileName(platformName, productName, task.slotCode, ext)
        const lastDot = baseName.lastIndexOf('.')
        const idx = String(index + 1).padStart(2, '0')
        const fileName = lastDot > -1
          ? `${baseName.slice(0, lastDot)}_${idx}.${baseName.slice(lastDot + 1)}`
          : `${baseName}_${idx}`

        const destPath = path.join(outputDir, fileName)
        fs.copyFileSync(asset.localPath, destPath)

        await prisma.exportMapping.create({
          data: {
            exportPackId: exportPack.id,
            candidateAssetId: asset.id,
            originalFileName: path.basename(asset.localPath),
            exportedFileName: fileName,
            slotType: task.slotCode,
          },
        })

        manifestData.items.push({
          fileName,
          originalFile: asset.localPath,
          slotType: task.slotCode,
          platform: platformName,
          productName: task.product?.productName || 'Unknown',
          qcGrade: task.qcResults[0]?.overallGrade || 'N/A',
          reviewAction: task.reviewRecords[0]?.action || null,
          reviewComment: task.reviewRecords[0]?.comment || null,
        })
        index++
        fileCount++
      }
    }

    const readme = this.generateReadme(manifestData)
    fs.writeFileSync(path.join(outputDir, 'readme.txt'), readme, 'utf-8')

    const namingDoc = this.generateNamingDoc()
    fs.writeFileSync(path.join(outputDir, '命名规则.txt'), namingDoc, 'utf-8')

    const riskText =
      manifestData.risks.length > 0
        ? manifestData.risks.join('\n')
        : '无风险项'
    fs.writeFileSync(path.join(outputDir, '风险与异常说明.txt'), riskText, 'utf-8')

    const zipPath = path.join(STORAGE_DIR, `${exportPack.id}.zip`)
    const output = fs.createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })

    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      archive.directory(outputDir, false)
      archive.finalize()
    })

    await prisma.exportManifest.create({
      data: {
        exportPackId: exportPack.id,
        manifestContent: JSON.stringify(manifestData),
      },
    })

    await prisma.exportPack.update({
      where: { id: exportPack.id },
      data: {
        status: 'completed',
        fileCount,
        fileUrl: zipPath,
        generatedAt: new Date(),
      },
    })

    for (const task of tasks) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'exported' },
      })
    }

    fs.rmSync(outputDir, { recursive: true, force: true })

    await dispatchHook('export:after', { exportPackId: exportPack.id, projectId, fileCount })

    return { exportPackId: exportPack.id, filePath: zipPath }
  }

  private generateReadme(data: ManifestData): string {
    const lines = [
      'Mircioo 导出素材包',
      `项目: ${data.projectId}`,
      `导出时间: ${data.exportTime}`,
      `包含图片: ${data.items.length} 张`,
      '',
      '图位映射表:',
    ]
    for (const item of data.items) {
      lines.push(
        `  ${item.fileName} — ${item.slotType} (${item.platform}) [QS:${item.qcGrade}]`,
      )
    }
    if (data.risks.length > 0) {
      lines.push('')
      lines.push('风险说明:')
      for (const r of data.risks) {
        lines.push(`  - ${r}`)
      }
    }
    return lines.join('\n')
  }

  private generateNamingDoc(): string {
    const rules = exportRuleRegistry.getAllRules()
    const platformLines = rules.map((r: ExportNamingRule) => {
      const slots = Object.entries(r.slotTypeFileNameMap)
        .map(([k, v]) => `${k}→${v}`)
        .join(', ')
      return `[${r.platform}] 模板: ${r.namingTemplate} | 图位映射: ${slots}`
    })
    return [
      'Mircioo 各平台文件命名规则',
      '文件名格式: {平台模板}_{序号}',
      '',
      ...platformLines,
      '',
      '序号为导出时的全局自动编号(01起)。',
    ].join('\n')
  }
}
