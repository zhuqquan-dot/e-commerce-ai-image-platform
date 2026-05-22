export interface ImageGenerationProvider {
  submit(prompt: string, options: GenerationOptions): Promise<SubmitResult>;
  poll(taskId: string): Promise<PollResult>;
  cancel(taskId: string): Promise<void>;
  download(taskId: string, outputDir: string): Promise<string[]>;
  health(): Promise<HealthStatus>;
}

export interface GenerationOptions {
  size?: string;
  quality?: string;
  n?: number;
  imageUrls?: string[];
  outputFormat?: string;
}

export interface SubmitResult {
  taskId: string;
  status: 'completed' | 'processing';
  images?: string[];
}

export interface PollResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  images?: string[];
  error?: string;
}

export interface HealthStatus {
  available: boolean;
  latency?: number;
  quota?: { remaining: number; total: number };
}
