import { ImageGenerationProvider } from './provider-interface';

export class ProviderRegistry {
  private providers: Map<string, ImageGenerationProvider> = new Map();

  register(providerId: string, provider: ImageGenerationProvider): void {
    if (this.providers.has(providerId)) {
      throw new Error(`Provider "${providerId}" is already registered`);
    }
    this.providers.set(providerId, provider);
  }

  get(providerId: string): ImageGenerationProvider | undefined {
    return this.providers.get(providerId);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  unregister(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider "${providerId}" is not registered`);
    }
    this.providers.delete(providerId);
  }
}
