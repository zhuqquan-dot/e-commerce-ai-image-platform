import { prisma } from '@/lib/prisma'
import type {
  ConsistencyDetectionProvider,
  ProductConsistencyInput,
  StyleConsistencyInput,
  DetectionResult,
} from './consistency-detection-provider'

export class RuleBasedDetectionProvider implements ConsistencyDetectionProvider {
  readonly providerName = 'rule-based'
  readonly providerVersion = '1.0.0'

  async detectProductConsistency(input: ProductConsistencyInput): Promise<DetectionResult> {
    const product = await prisma.product.findUnique({ where: { id: input.productId } })
    if (!product) {
      return {
        score: 0,
        reasons: ['商品不存在'],
        detectionMethod: 'rule-based-field-presence',
        provider: this.providerName,
        providerVersion: this.providerVersion,
      }
    }

    const reasons: string[] = []
    let filled = 0
    let total = 0

    const checkField = (field: string, value: string | undefined | null) => {
      total++
      if (value != null && value !== '') {
        filled++
        reasons.push(`${field}: ${value}`)
      } else {
        reasons.push(`${field}: 未填写(真值缺失)`)
      }
    }

    const checkListField = (field: string, jsonStr: string | undefined | null) => {
      total++
      try {
        const list = JSON.parse(jsonStr || '[]') as unknown[]
        if (list.length > 0) {
          filled++
          reasons.push(`${field}: ${list.join('、')}`)
        } else {
          reasons.push(`${field}: 未配置约束`)
        }
      } catch {
        reasons.push(`${field}: 格式异常`)
      }
    }

    checkField('productName', product.productName)
    checkField('sku', product.sku)
    checkField('category', product.category)
    checkField('material', product.material)
    checkField('color', product.color)
    checkField('size', product.size)
    checkField('weight', product.weight)
    checkField('capacity', product.capacity)
    checkField('model', product.model)
    checkField('compatibleModel', product.compatibleModel)
    checkField('packageContents', product.packageContents)
    checkField('mainColor', product.mainColor)
    checkField('secondaryColor', product.secondaryColor)
    checkField('shapeType', product.shapeType)
    checkField('edgeFeature', product.edgeFeature)
    checkField('surfaceMaterial', product.surfaceMaterial)
    checkField('textureFeature', product.textureFeature)
    checkField('logoPosition', product.logoPosition)
    checkField('labelPosition', product.labelPosition)
    checkField('buttonPortPosition', product.buttonPortPosition)
    checkField('structurePartition', product.structurePartition)
    checkField('accessoryCount', product.accessoryCount)
    checkListField('mustNotChangeFeatures', product.mustNotChangeFeatures)
    checkListField('mustNotDisappearFeatures', product.mustNotDisappearFeatures)
    checkListField('mustNotAddFeatures', product.mustNotAddFeatures)
    checkListField('allowMinorVariationFields', product.allowMinorVariationFields)
    checkField('differentiation', product.differentiation)

    const score = total > 0 ? Math.round((filled / total) * 100) : 50

    return {
      score,
      reasons,
      detectionMethod: 'rule-based-field-presence',
      provider: this.providerName,
      providerVersion: this.providerVersion,
    }
  }

  async detectStyleConsistency(input: StyleConsistencyInput): Promise<DetectionResult> {
    const reasons: string[] = []
    let filled = 0
    let total = 0

    const push = (label: string, value: string | undefined | null) => {
      total++
      if (value != null && value !== '' && value !== '[]') {
        filled++
        reasons.push(`${label}: ${value}`)
      } else {
        reasons.push(`${label}: 未配置`)
      }
    }

    if (input.seriesPackId) {
      const seriesPack = await prisma.seriesPack.findUnique({
        where: { id: input.seriesPackId },
        include: { brandPack: true },
      })
      if (!seriesPack) {
        return {
          score: 0,
          reasons: ['系列包不存在'],
          detectionMethod: 'rule-based-style-constraint',
          provider: this.providerName,
          providerVersion: this.providerVersion,
        }
      }

      push('seriesName', seriesPack.seriesName)
      push('styleLockText', seriesPack.styleLockText)
      push('fixedPalette', seriesPack.fixedPalette)
      push('backgroundSystem', seriesPack.backgroundSystem)
      push('lightingSystem', seriesPack.lightingSystem)
      push('defaultBundleStructure', seriesPack.defaultBundleStructure)
      push('defaultReviewThreshold', seriesPack.defaultReviewThreshold)

      if (seriesPack.brandPack) {
        push('brandPrimaryColor', seriesPack.brandPack.brandPrimaryColor)
        push('brandSecondaryColor', seriesPack.brandPack.brandSecondaryColor)
        push('brandFontPreference', seriesPack.brandPack.brandFontPreference)
        push('brandTone', seriesPack.brandPack.brandTone)
        push('brandVisualBoundary', seriesPack.brandPack.brandVisualBoundary)
      }
    } else if (input.brandPackId) {
      const brandPack = await prisma.brandPack.findUnique({
        where: { id: input.brandPackId },
      })
      if (!brandPack) {
        return {
          score: 0,
          reasons: ['品牌包不存在'],
          detectionMethod: 'rule-based-style-constraint',
          provider: this.providerName,
          providerVersion: this.providerVersion,
        }
      }

      push('brandPrimaryColor', brandPack.brandPrimaryColor)
      push('brandSecondaryColor', brandPack.brandSecondaryColor)
      push('brandFontPreference', brandPack.brandFontPreference)
      push('brandTone', brandPack.brandTone)
      push('brandVisualBoundary', brandPack.brandVisualBoundary)
    } else {
      return {
        score: 70,
        reasons: ['未关联系列包或品牌包，无法检测风格一致性'],
        detectionMethod: 'rule-based-style-constraint',
        provider: this.providerName,
        providerVersion: this.providerVersion,
      }
    }

    const score = total > 0 ? Math.round((filled / total) * 100) : 70

    return {
      score,
      reasons,
      detectionMethod: 'rule-based-style-constraint',
      provider: this.providerName,
      providerVersion: this.providerVersion,
    }
  }
}

export const ruleBasedDetectionProvider = new RuleBasedDetectionProvider()
