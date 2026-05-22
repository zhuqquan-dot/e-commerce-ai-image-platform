export enum Platform {
  TAOBAO_TMALL = 'TAOBAO_TMALL',
  JD = 'JD',
  PINDUODUO = 'PINDUODUO',
  DOUYIN = 'DOUYIN',
  AMAZON = 'AMAZON',
  EBAY = 'EBAY',
  ETSY = 'ETSY',
  SHOPIFY = 'SHOPIFY',
  TIKTOK_SHOP = 'TIKTOK_SHOP',
  ALIEXPRESS = 'ALIEXPRESS',
}

export enum SlotType {
  MAIN_WHITE = 'main_white',
  MAIN_TEXT = 'main_text',
  FEATURE = 'feature',
  SCENE = 'scene',
  SPEC = 'spec',
  COMPARE = 'compare',
  TRUST = 'trust',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  PLANNED = 'planned',
  GENERATING = 'generating',
  REVIEWING = 'reviewing',
  EXPORT_READY = 'export_ready',
  EXPORTED = 'exported',
  FAILED = 'failed',
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPILED = 'compiled',
  QUEUED = 'queued',
  RUNNING = 'running',
  GENERATED = 'generated',
  COMPILE_FAILED = 'compile_failed',
  BLOCKED = 'blocked',
  QC_BLOCKED = 'qc_blocked',
  QC_FAILED = 'qc_failed',
  REVIEW_PENDING = 'review_pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPORTED = 'exported',
}

export enum AttemptStatus {
  CREATED = 'created',
  SUBMITTED = 'submitted',
  POLLING = 'polling',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  PROVIDER_FAILOVER = 'provider_failover',
}

export enum QCGrade {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum InputMode {
  QUICK = 'quick',
  STANDARD = 'standard',
  HIGH_CONSISTENCY = 'high_consistency',
}

export enum ProjectType {
  SINGLE_PRODUCT_SINGLE_PLATFORM = 'single_product_single_platform',
  SINGLE_PRODUCT_MULTI_PLATFORM = 'single_product_multi_platform',
  MULTI_PRODUCT_BATCH = 'multi_product_batch',
}

export enum ExportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
