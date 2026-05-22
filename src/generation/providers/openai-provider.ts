import OpenAI from 'openai';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  ImageGenerationProvider,
  GenerationOptions,
  SubmitResult,
  PollResult,
  HealthStatus,
} from '../provider-interface';

export class OpenAIProvider implements ImageGenerationProvider {
  private client: OpenAI;

  constructor(config: { apiKey: string; baseURL?: string }) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async submit(prompt: string, options: GenerationOptions): Promise<SubmitResult> {
    const size = (options.size || '1024x1024') as
      | '256x256'
      | '512x512'
      | '1024x1024'
      | '1792x1024'
      | '1024x1792';

    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: options.n ?? 1,
      size,
      quality: (options.quality as 'standard' | 'hd') ?? 'standard',
      response_format: 'url',
    });

    const data = response.data ?? [];
    const images = data
      .map((img) => img.url)
      .filter((url): url is string => url != null);

    return {
      taskId: `openai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'completed',
      images,
    };
  }

  async poll(_taskId: string): Promise<PollResult> {
    return { status: 'completed', images: [] };
  }

  async cancel(_taskId: string): Promise<void> {
    return;
  }

  async download(taskId: string, outputDir: string): Promise<string[]> {
    const dir = path.resolve(outputDir);
    await fs.mkdir(dir, { recursive: true });

    const result = await this.poll(taskId);
    if (!result.images || result.images.length === 0) {
      return [];
    }

    const savedPaths: string[] = [];
    for (let i = 0; i < result.images.length; i++) {
      const imageUrl = result.images[i];
      const ext = '.png';
      const filename = `${taskId}_${i}${ext}`;
      const filePath = path.join(dir, filename);

      const resp = await fetch(imageUrl);
      if (!resp.ok) {
        throw new Error(`Failed to download image: ${resp.statusText}`);
      }
      const buffer = Buffer.from(await resp.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      savedPaths.push(filePath);
    }

    return savedPaths;
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await this.client.models.list();
      const latency = Date.now() - start;
      return { available: true, latency };
    } catch {
      return { available: false };
    }
  }
}
