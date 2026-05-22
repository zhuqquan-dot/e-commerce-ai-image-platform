import { prisma } from '@/lib/prisma';

export interface RuleCompleteness {
  platform: string;
  filledFields: string[];
  missingFields: string[];
  version: string;
  lastUpdated: string;
}

export class PlatformRuleRegistry {
  async getRule(platform: string) {
    return prisma.platformRulePack.findUnique({ where: { platformName: platform } });
  }

  async getAllRules() {
    return prisma.platformRulePack.findMany({ orderBy: { platformName: 'asc' } });
  }

  async getRuleCompleteness(platform: string): Promise<RuleCompleteness> {
    const rule = await prisma.platformRulePack.findUnique({ where: { platformName: platform } });
    if (!rule) throw new Error(`Platform ${platform} not found`);

    const REQUIRED_FIELDS = [
      'platformName', 'platformRegion', 'maxImages', 'mainImageRatio', 'mainImageSize',
      'allowedFormats', 'maxFileSizeMb', 'whiteBackgroundRequired', 'textAllowedOnMainImage',
      'watermarkAllowed', 'borderAllowed', 'logoAllowed', 'supportedSlots', 'forbiddenWords',
      'exportFileNamingRule', 'exportDirectoryStructure', 'exportSortOrder',
    ];

    const filledFields: string[] = [];
    const missingFields: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      const val = (rule as Record<string, unknown>)[field];
      if (val !== null && val !== undefined && val !== '' && val !== '[]' && val !== '{}') {
        filledFields.push(field);
      } else {
        missingFields.push(field);
      }
    }

    const versions = JSON.parse(rule.versions || '[]') as Array<{ version: string }>;
    return {
      platform,
      filledFields,
      missingFields,
      version: versions[0]?.version || 'unknown',
      lastUpdated: rule.updatedAt.toISOString(),
    };
  }

  async listVersions(platform: string) {
    return prisma.platformRuleVersion.findMany({
      where: { platformName: platform },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(platform: string, data: Record<string, unknown>) {
    const existing = await prisma.platformRulePack.findUnique({ where: { platformName: platform } });
    if (!existing) throw new Error(`Platform ${platform} not found`);

    const versions = JSON.parse(existing.versions || '[]') as Array<Record<string, unknown>>;
    const newVersion = `1.${versions.length}.0`;

    await prisma.platformRuleVersion.create({
      data: {
        platformName: platform,
        version: newVersion,
        snapshot: JSON.stringify(existing),
        changedBy: (data.changedBy as string) || 'system',
        changeNote: (data.changeNote as string) || 'Rule updated',
      },
    });

    const updated = await prisma.platformRulePack.update({
      where: { platformName: platform },
      data: {
        ...data,
        versions: JSON.stringify([{
          version: newVersion,
          changedBy: data.changedBy || 'system',
          changeNote: data.changeNote || 'Rule updated',
          createdAt: new Date().toISOString(),
        }, ...versions]),
      },
    });
    return updated;
  }

  async getAllCompleteness(): Promise<RuleCompleteness[]> {
    const rules = await this.getAllRules();
    return Promise.all(rules.map(r => this.getRuleCompleteness(r.platformName)));
  }
}

export const ruleRegistry = new PlatformRuleRegistry();
