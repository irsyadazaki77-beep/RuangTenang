import { logger } from '../utils/logger.js';

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface ImageGenerationResult {
  imageUrl: string;
  mimeType: string;
  provider: 'huggingface' | 'pollinations';
}

export class ImageGenerationService {
  private hfToken: string | undefined;

  constructor() {
    this.hfToken = process.env.HF_TOKEN;
  }

  /**
   * Menghasilkan gambar dari teks prompt secara gratis.
   * Urutan:
   * 1. Hugging Face Inference API (FLUX.1-schnell) jika HF_TOKEN terpasang.
   * 2. Fallback otomatis ke Pollinations.ai jika HF_TOKEN kosong atau gagal.
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const prompt = (options.prompt || '').trim();
    if (!prompt) {
      throw new Error('Prompt gambar tidak boleh kosong');
    }

    const width = options.width || 1024;
    const height = options.height || 1024;
    const seed = options.seed || Math.floor(Math.random() * 1000000);

    // 1. Coba Hugging Face jika ada token
    if (this.hfToken) {
      try {
        const result = await this.generateViaHuggingFace(prompt, width, height);
        return result;
      } catch (err: any) {
        logger.warn(`[ImageGen] Gagal generate via Hugging Face, beralih ke fallback: ${err?.message || err}`);
      }
    }

    // 2. Fallback ke Pollinations (Gratis, tanpa API key)
    try {
      return await this.generateViaPollinations(prompt, width, height, seed);
    } catch (err: any) {
      logger.error(`[ImageGen] Gagal generate via Pollinations fallback: ${err?.message || err}`);
      throw new Error('Gagal menghasilkan gambar melalui semua provider gratis');
    }
  }

  private async generateViaHuggingFace(prompt: string, width: number, height: number): Promise<ImageGenerationResult> {
    const endpoint = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width,
          height,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HF Error (${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    return {
      imageUrl: `data:${mimeType};base64,${base64}`,
      mimeType,
      provider: 'huggingface'
    };
  }

  private async generateViaPollinations(prompt: string, width: number, height: number, seed: number): Promise<ImageGenerationResult> {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Pollinations Error (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    return {
      imageUrl: `data:${mimeType};base64,${base64}`,
      mimeType,
      provider: 'pollinations'
    };
  }
}

export const imageGenerationService = new ImageGenerationService();
