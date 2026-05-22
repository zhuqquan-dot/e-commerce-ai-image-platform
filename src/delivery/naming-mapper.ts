import { exportRuleRegistry } from './export-rule-registry'

export class NamingMapper {
  static formatFileName(
    platform: string,
    productName: string,
    slotType: string,
    ext: string = 'jpg',
  ): string {
    return exportRuleRegistry.formatFileName(platform, productName, slotType, ext)
  }

  static getSlotFileName(platform: string, slotType: string): string {
    return exportRuleRegistry.getSlotFileName(platform, slotType) || slotType
  }
}
