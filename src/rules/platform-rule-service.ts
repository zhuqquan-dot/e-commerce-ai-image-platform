import { ruleRegistry, RuleCompleteness } from '@/rules/platform-rule-registry';

export type { RuleCompleteness };

export class PlatformRuleService {
  private registry = ruleRegistry;

  async getRule(platform: string) {
    return this.registry.getRule(platform);
  }

  async getAllRules() {
    return this.registry.getAllRules();
  }

  async getRuleCompleteness(platform: string) {
    return this.registry.getRuleCompleteness(platform);
  }

  async getAllCompleteness() {
    return this.registry.getAllCompleteness();
  }

  async listVersions(platform: string) {
    return this.registry.listVersions(platform);
  }

  async updateRule(platform: string, data: Record<string, unknown>) {
    return this.registry.updateRule(platform, data);
  }
}

export const platformRuleService = new PlatformRuleService();
