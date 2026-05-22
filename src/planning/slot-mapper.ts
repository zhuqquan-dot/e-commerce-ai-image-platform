import { slotMappingRegistry, type SlotMappingEntry } from './slot-mapping-registry';

export class SlotMapper {
  static resolve(platform: string, nativeName: string) {
    return slotMappingRegistry.resolveSlotType(platform, nativeName);
  }

  static getMapping(platform: string): SlotMappingEntry[] {
    return slotMappingRegistry.getMapping(platform);
  }

  static getAllPlatforms(): string[] {
    return slotMappingRegistry.getAllPlatforms();
  }
}
