import { prisma } from '@/lib/prisma';
import { ProviderRegistry } from './provider-registry';
import { ImageGenerationProvider } from './provider-interface';
import { OpenAIProvider } from './providers/openai-provider';

export interface ProviderConfigItem {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  baseURL: string | null;
  priority: number;
  isActive: boolean;
  config: string | null;
}

export class ProviderSelector {
  private initialized = false;

  constructor(private registry: ProviderRegistry) {}

  private initProviders(providers: ProviderConfigItem[]): void {
    for (const p of providers) {
      const providerId = p.id;
      if (this.registry.get(providerId)) {
        continue;
      }
      const provider = this.createProvider(p);
      if (provider) {
        this.registry.register(providerId, provider);
      }
    }
  }

  private createProvider(config: ProviderConfigItem): ImageGenerationProvider | null {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseURL: config.baseURL ?? undefined,
        });
      case 'apimart':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseURL: config.baseURL ?? 'https://api.apimart.ai/v1',
        });
      default:
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseURL: config.baseURL ?? undefined,
        });
    }
  }

  async select(providers: ProviderConfigItem[]): Promise<ImageGenerationProvider> {
    this.initProviders(providers);

    const sorted = [...providers].sort((a, b) => a.priority - b.priority);

    for (const p of sorted) {
      const provider = this.registry.get(p.id);
      if (!provider) {
        continue;
      }
      const status = await provider.health();
      if (status.available) {
        return provider;
      }
    }

    throw new Error('No available provider found');
  }

  async getActiveProvider(): Promise<{
    provider: ImageGenerationProvider;
    config: ProviderConfigItem;
  }> {
    const dbProviders = await prisma.providerConfig.findMany({
      where: { isActive: true },
    });
    if (dbProviders.length === 0) {
      throw new Error('No active provider configured');
    }

    const configs: ProviderConfigItem[] = dbProviders.map((p) => ({
      ...p,
      baseURL: p.baseURL ?? null,
      config: p.config ?? null,
    }));

    const provider = await this.select(configs);
    const matchedConfig = configs.find((c) => {
      const regProvider = this.registry.get(c.id);
      return regProvider === provider;
    })!;

    return { provider, config: matchedConfig };
  }
}
