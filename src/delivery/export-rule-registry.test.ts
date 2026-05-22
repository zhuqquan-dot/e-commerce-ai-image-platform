import { describe, it, expect } from 'vitest'
import { exportRuleRegistry, ExportRuleRegistry } from './export-rule-registry'

describe('ExportRuleRegistry', () => {
  const ALL_PLATFORMS = [
    'AMAZON',
    'TAOBAO_TMALL',
    'DOUYIN',
    'JD',
    'PINDUODUO',
    'SHOPIFY',
    'EBAY',
    'ETSY',
    'TIKTOK_SHOP',
    'ALIEXPRESS',
  ]

  it('10 平台全部有导出规则', () => {
    const rules = exportRuleRegistry.getAllRules()
    expect(rules.length).toBe(10)
    for (const p of ALL_PLATFORMS) {
      const rule = exportRuleRegistry.getRule(p)
      expect(rule).toBeDefined()
      expect(rule!.platform).toBe(p)
    }
  })

  it('getRule 对未知平台返回 undefined', () => {
    expect(exportRuleRegistry.getRule('NONEXISTENT')).toBeUndefined()
  })

  it('Amazon 命名模板正确', () => {
    const rule = exportRuleRegistry.getRule('AMAZON')
    expect(rule).toBeDefined()
    expect(rule!.namingTemplate).toBe('{productName}_{slotType}.jpg')
    expect(rule!.slotTypeFileNameMap.main_white).toBe('MAIN')
    expect(rule!.slotTypeFileNameMap.feature).toBe('PT1')
    expect(rule!.slotTypeFileNameMap.trust).toBe('PT5')
    expect(rule!.deliveryNotes.whiteBgRequired).toBe(true)
    expect(rule!.deliveryNotes.textAllowed).toBe(false)
    expect(rule!.deliveryNotes.watermarkAllowed).toBe(false)
    expect(rule!.deliveryNotes.borderAllowed).toBe(false)
    expect(rule!.deliveryNotes.notes).toContain('纯白背景')
  })

  it('淘宝命名模板正确', () => {
    const rule = exportRuleRegistry.getRule('TAOBAO_TMALL')
    expect(rule).toBeDefined()
    expect(rule!.namingTemplate).toBe('主图_{position}_{productName}.{ext}')
    expect(rule!.slotTypeFileNameMap.main_white).toBe('白底')
    expect(rule!.slotTypeFileNameMap.main_text).toBe('带文案')
    expect(rule!.sortOrder).toContain('main_white')
    expect(rule!.sortOrder).toContain('main_text')
    expect(rule!.deliveryNotes.whiteBgRequired).toBe(false)
    expect(rule!.deliveryNotes.textAllowed).toBe(true)
  })

  it('拼多多主图仅有 main_text，无 main_white', () => {
    const rule = exportRuleRegistry.getRule('PINDUODUO')
    expect(rule).toBeDefined()
    expect(rule!.slotTypeFileNameMap.main_text).toBeDefined()
    expect(rule!.slotTypeFileNameMap.main_white).toBeUndefined()
    expect(rule!.sortOrder[0]).toBe('main_text')
  })

  it('formatFileName 功能正常 — AMAZON', () => {
    const name = exportRuleRegistry.formatFileName('AMAZON', 'iPhone 15', 'main_white', 'jpg')
    expect(name).toBe('iPhone_15_MAIN.jpg')
  })

  it('formatFileName 功能正常 — AMAZON feature', () => {
    const name = exportRuleRegistry.formatFileName('AMAZON', 'iPhone 15', 'feature', 'jpg')
    expect(name).toBe('iPhone_15_PT1.jpg')
  })

  it('formatFileName 功能正常 — TAOBAO_TMALL', () => {
    const name = exportRuleRegistry.formatFileName('TAOBAO_TMALL', '运动鞋', 'main_white', 'jpg')
    expect(name).toBe('主图_白底_运动鞋.jpg')
  })

  it('formatFileName 功能正常 — TAOBAO_TMALL main_text', () => {
    const name = exportRuleRegistry.formatFileName('TAOBAO_TMALL', '运动鞋', 'main_text', 'png')
    expect(name).toBe('主图_带文案_运动鞋.png')
  })

  it('formatFileName 功能正常 — SHOPIFY', () => {
    const name = exportRuleRegistry.formatFileName('SHOPIFY', 'Watch', 'scene', 'webp')
    expect(name).toBe('Watch_lifestyle.webp')
  })

  it('formatFileName 功能正常 — JD', () => {
    const name = exportRuleRegistry.formatFileName('JD', '笔记本', 'main_white', 'jpg')
    expect(name).toBe('笔记本_主图.jpg')
  })

  it('formatFileName 功能正常 — DOUYIN', () => {
    const name = exportRuleRegistry.formatFileName('DOUYIN', '口红', 'main_white', 'jpg')
    expect(name).toBe('口红_主图白底.jpg')
  })

  it('formatFileName 特殊字符产品名应被清理', () => {
    const name = exportRuleRegistry.formatFileName('AMAZON', 'Product/Name:Test', 'main_white', 'jpg')
    expect(name).toBe('Product_Name_Test_MAIN.jpg')
  })

  it('formatFileName 产品名超过 30 字符应截断', () => {
    const longName = 'A'.repeat(50)
    const name = exportRuleRegistry.formatFileName('AMAZON', longName, 'main_white', 'jpg')
    const parts = name.split('_')
    expect(parts[0].length).toBeLessThanOrEqual(30)
  })

  it('formatFileName 未知平台回退到默认格式', () => {
    const name = exportRuleRegistry.formatFileName('UNKNOWN', 'Product', 'main_white', 'jpg')
    expect(name).toBe('Product_main_white.jpg')
  })

  it('getSlotFileName 功能正常 — AMAZON', () => {
    expect(exportRuleRegistry.getSlotFileName('AMAZON', 'main_white')).toBe('MAIN')
    expect(exportRuleRegistry.getSlotFileName('AMAZON', 'trust')).toBe('PT5')
    expect(exportRuleRegistry.getSlotFileName('AMAZON', 'unknown_slot')).toBe('unknown_slot')
  })

  it('getSlotFileName 功能正常 — ETSY spec→process', () => {
    expect(exportRuleRegistry.getSlotFileName('ETSY', 'spec')).toBe('process')
    expect(exportRuleRegistry.getSlotFileName('ETSY', 'scene')).toBe('lifestyle')
  })

  it('getSlotFileName 未知平台返回原始 slotType', () => {
    expect(exportRuleRegistry.getSlotFileName('UNKNOWN', 'main_white')).toBe('main_white')
  })

  it('sortOrder 包含 slotTypeFileNameMap 全部 key', () => {
    for (const p of ALL_PLATFORMS) {
      const rule = exportRuleRegistry.getRule(p)!
      const sortSet = new Set(rule.sortOrder)
      const mapKeys = Object.keys(rule.slotTypeFileNameMap)
      for (const k of mapKeys) {
        expect(sortSet.has(k)).toBe(true)
      }
    }
  })

  it('每个平台 deliveryNotes 结构完整', () => {
    for (const p of ALL_PLATFORMS) {
      const rule = exportRuleRegistry.getRule(p)!
      const dn = rule.deliveryNotes
      expect(dn).toBeDefined()
      expect(typeof dn.whiteBgRequired).toBe('boolean')
      expect(typeof dn.textAllowed).toBe('boolean')
      expect(typeof dn.watermarkAllowed).toBe('boolean')
      expect(typeof dn.borderAllowed).toBe('boolean')
      expect(typeof dn.notes).toBe('string')
    }
  })

  it('每个平台 directoryStructure 结构完整', () => {
    for (const p of ALL_PLATFORMS) {
      const rule = exportRuleRegistry.getRule(p)!
      const ds = rule.directoryStructure
      expect(ds).toBeDefined()
      expect(typeof ds.rootDir).toBe('string')
      expect(typeof ds.imagesDir).toBe('string')
      expect(typeof ds.includeReadme).toBe('boolean')
      expect(typeof ds.includeManifest).toBe('boolean')
    }
  })

  it('每个平台 namingTemplate 包含 productName', () => {
    for (const p of ALL_PLATFORMS) {
      const rule = exportRuleRegistry.getRule(p)!
      expect(rule.namingTemplate).toContain('{productName}')
    }
  })

  it('每个平台 slotTypeFileNameMap 非空', () => {
    for (const p of ALL_PLATFORMS) {
      const rule = exportRuleRegistry.getRule(p)!
      expect(Object.keys(rule.slotTypeFileNameMap).length).toBeGreaterThan(0)
    }
  })

  it('getSortOrder 返回平台排序（不修改内部状态）', () => {
    const order = exportRuleRegistry.getSortOrder('AMAZON')
    expect(order).toEqual(['main_white', 'feature', 'scene', 'spec', 'compare', 'trust'])
    order.push('EXTRA')
    const orderAgain = exportRuleRegistry.getSortOrder('AMAZON')
    expect(orderAgain).toEqual(['main_white', 'feature', 'scene', 'spec', 'compare', 'trust'])
  })

  it('getSortOrder 未知平台返回空数组', () => {
    expect(exportRuleRegistry.getSortOrder('NONEXISTENT')).toEqual([])
  })

  it('SHOPIFY 最灵活 — 允许文字/水印/边框', () => {
    const rule = exportRuleRegistry.getRule('SHOPIFY')!
    expect(rule.deliveryNotes.textAllowed).toBe(true)
    expect(rule.deliveryNotes.watermarkAllowed).toBe(true)
    expect(rule.deliveryNotes.borderAllowed).toBe(true)
  })

  it('TIKTOK_SHOP 要求白底主图', () => {
    const rule = exportRuleRegistry.getRule('TIKTOK_SHOP')!
    expect(rule.deliveryNotes.whiteBgRequired).toBe(true)
    expect(rule.deliveryNotes.notes).toContain('600×600')
  })

  it('ExportRuleRegistry.RULES 是静态只读的', () => {
    expect(ExportRuleRegistry.RULES.length).toBe(10)
  })

  it('exportRuleRegistry 是单例', () => {
    const registry1 = exportRuleRegistry
    const registry2 = exportRuleRegistry
    expect(registry1).toBe(registry2)
    expect(registry1.getAllRules().length).toBe(10)
    expect(registry2.getAllRules().length).toBe(10)
  })
})
