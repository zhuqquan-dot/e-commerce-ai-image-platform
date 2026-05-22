export interface ProductConsistencyInput {
  productId: string
  imageUrl: string
  taskId: string
}

export interface StyleConsistencyInput {
  seriesPackId?: string
  brandPackId?: string
  imagePlaceholders: string[]
  projectId: string
}

export interface DetectionResult {
  score: number
  reasons: string[]
  detectionMethod: string
  provider: string
  providerVersion: string
}

export interface ConsistencyDetectionProvider {
  readonly providerName: string
  readonly providerVersion: string
  detectProductConsistency(input: ProductConsistencyInput): Promise<DetectionResult>
  detectStyleConsistency(input: StyleConsistencyInput): Promise<DetectionResult>
}
