export interface ComplianceRule {
  platform: string;
  whiteBg: {
    required: boolean;
    tolerance: { rMin: number; gMin: number; bMin: number };
  };
  text: {
    allowed: boolean;
    maxLines: number;
    maxChars: number;
    fontRequirements: string;
  };
  forbiddenElements: string[];
  priceOverlayZone: { x: number; y: number; width: number; height: number; description: string } | null;
  absoluteTermsForbidden: boolean;
  medicalTermsForbidden: boolean;
}

export function getComplianceRuleFromDB(rule: Record<string, unknown>): ComplianceRule {
  const textConstraints = JSON.parse(String(rule.textConstraints || '{}'));
  return {
    platform: String(rule.platformName),
    whiteBg: {
      required: Boolean(rule.whiteBackgroundRequired),
      tolerance: {
        rMin: Number(rule.whiteBackgroundToleranceR ?? 250),
        gMin: Number(rule.whiteBackgroundToleranceG ?? 250),
        bMin: Number(rule.whiteBackgroundToleranceB ?? 250),
      },
    },
    text: {
      allowed: Boolean(rule.textAllowedOnMainImage),
      maxLines: Number(textConstraints.maxLines ?? 0),
      maxChars: Number(textConstraints.maxChars ?? 0),
      fontRequirements: String(textConstraints.fontRequirements ?? ''),
    },
    forbiddenElements: JSON.parse(String(rule.forbiddenElements || '[]')),
    priceOverlayZone: (() => {
      const zone = JSON.parse(String(rule.priceOverlayZone || '{}'));
      return zone.x !== undefined ? zone : null;
    })(),
    absoluteTermsForbidden: Boolean(rule.absoluteTermsForbidden),
    medicalTermsForbidden: Boolean(rule.medicalTermsForbidden),
  };
}
