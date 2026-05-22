import type { ConsistencyDetectionProvider } from './consistency-detection-provider'
import { RuleBasedDetectionProvider } from './rule-based-detection-provider'

export class ProviderRegistry {
  private static instance: ProviderRegistry
  private productProvider: ConsistencyDetectionProvider
  private styleProvider: ConsistencyDetectionProvider

  private constructor() {
    const defaultProvider = new RuleBasedDetectionProvider()
    this.productProvider = defaultProvider
    this.styleProvider = defaultProvider
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry()
    }
    return ProviderRegistry.instance
  }

  getProductProvider(): ConsistencyDetectionProvider {
    return this.productProvider
  }

  getStyleProvider(): ConsistencyDetectionProvider {
    return this.styleProvider
  }

  setProductProvider(provider: ConsistencyDetectionProvider): void {
    this.productProvider = provider
  }

  setStyleProvider(provider: ConsistencyDetectionProvider): void {
    this.styleProvider = provider
  }
}
