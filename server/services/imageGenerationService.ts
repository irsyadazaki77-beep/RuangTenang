import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';

export type ImageStylePreset = 'academic_illustration' | 'vector_infographic' | 'photorealistic' | 'minimalist_diagram' | 'none';

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  style?: ImageStylePreset;
}

export interface ImageGenerationResult {
  imageUrl: string;
  mimeType: string;
  provider: 'local-sd' | 'huggingface' | 'pollinations';
  imageId?: string;
  enhancedPrompt?: string;
}

const CACHE_DIR = path.resolve(process.cwd(), 'uploads', 'generated-images');

// Pastikan folder cache gambar tersedia
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export class ImageGenerationService {
  private hfToken: string | undefined;
  private localSdUrl: string | undefined;

  constructor() {
    this.hfToken = process.env.HF_TOKEN;
    this.localSdUrl = process.env.LOCAL_SD_URL || 'http://127.0.0.1:7860';
  }

  /**
   * Meningkatkan prompt dengan menerjemahkan kata kunci bahasa Indonesia ke bahasa Inggris
   * dan menambahkan pengarah gaya artistik sesuai preset yang dipilih.
   */
  public enhancePrompt(rawPrompt: string, style?: ImageStylePreset): string {
    let text = rawPrompt.trim();

    // Kamus terjemahan istilah umum akademik / visual bahasa Indonesia ke bahasa Inggris
    const idToEnMap: Array<[RegExp, string]> = [
      [/\bmahasiswa\b/gi, 'college students'],
      [/\bperpustakaan\b/gi, 'modern library'],
      [/\bgambar\b/gi, 'image'],
      [/\bilustrasi\b/gi, 'illustration'],
      [/\bposter\b/gi, 'infographic poster'],
      [/\bdiagram\b/gi, 'schematic diagram'],
      [/\balur kerja\b/gi, 'workflow flowchart'],
      [/\bpenelitian\b/gi, 'scientific research'],
      [/\blaporan\b/gi, 'formal report cover'],
      [/\bkecerdasan buatan\b/gi, 'artificial intelligence'],
      [/\bpembelajaran mesin\b/gi, 'machine learning'],
      [/\bbuku\b/gi, 'academic textbook'],
      [/\blaboratorium\b/gi, 'scientific laboratory'],
      [/\bdosen\b/gi, 'professor'],
      [/\buniversitas\b/gi, 'university campus'],
      [/\bkampus\b/gi, 'campus'],
      [/\bdata\b/gi, 'data analytics'],
      [/\bgrafik\b/gi, 'statistical chart'],
      [/\botak\b/gi, 'human brain neurology'],
      [/\bkesehatan mental\b/gi, 'mental health well-being'],
      [/\btenang\b/gi, 'calm peaceful serene'],
      [/\bmeditasi\b/gi, 'mindfulness meditation'],
      [/\bbimbingan\b/gi, 'counseling session'],
    ];

    for (const [regex, replacement] of idToEnMap) {
      text = text.replace(regex, replacement);
    }

    const styleModifiers: Record<ImageStylePreset, string> = {
      academic_illustration: 'clean academic scientific illustration, modern educational visualization, high resolution, detailed, scholarly aesthetic, highly aesthetic',
      vector_infographic: 'clean vector flat infographic design, minimalist graphic icons, modern color palette, sharp lines, professional white background',
      photorealistic: 'photorealistic, natural lighting, ultra high definition 8k, sharp focus, realistic photography, authentic atmosphere',
      minimalist_diagram: 'minimalist technical diagram, crisp schematic architectural vector, clear contrast, clean lines, professional presentation',
      none: ''
    };

    const modifier = style && styleModifiers[style] ? styleModifiers[style] : styleModifiers.academic_illustration;
    return modifier ? `${text}, ${modifier}` : text;
  }

  /**
   * Bersihkan berkas cache yang usianya melebihi batas waktu (default 7 hari)
   */
  public cleanOldCache(maxAgeDays = 7): void {
    try {
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (!file.endsWith('.jpg')) continue;
        const fullPath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
          logger.info(`[ImageGen] Cache kadaluarsa dihapus: ${file}`);
        }
      }
    } catch (err: any) {
      logger.warn(`[ImageGen] Gagal membersihkan cache lama: ${err?.message}`);
    }
  }

  /**
   * Menghasilkan gambar dari teks prompt secara gratis & menyimpannya ke storage ter-cache.
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const prompt = (options.prompt || '').trim();
    if (!prompt) {
      throw new Error('Prompt gambar tidak boleh kosong');
    }

    const style = options.style || 'academic_illustration';
    const effectivePrompt = this.enhancePrompt(prompt, style);
    const width = options.width || 1024;
    const height = options.height || 1024;
    const seed = options.seed || Math.floor(Math.random() * 1000000);

    // Cek cache lokal berdasarkan hash prompt asli + gaya + dimensi agar tidak re-generate
    const cacheKey = crypto.createHash('sha256').update(`${prompt}:${style}:${width}:${height}`).digest('hex');
    const cachedImagePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

    if (fs.existsSync(cachedImagePath)) {
      logger.info(`[ImageGen] Cache hit untuk prompt hash: ${cacheKey}`);
      return {
        imageUrl: `/api/ai/images/${cacheKey}.jpg`,
        mimeType: 'image/jpeg',
        provider: 'local-sd',
        imageId: cacheKey,
        enhancedPrompt: effectivePrompt,
      };
    }

    // Pembersihan periodik ringan
    if (Math.random() < 0.05) {
      this.cleanOldCache(7);
    }

    // 1. Coba Local AI (Stable Diffusion WebUI / Forge / ComfyUI / Microservice)
    const isLocalSdAvailable = await this.checkLocalSdAvailable();
    if (isLocalSdAvailable) {
      try {
        logger.info(`[ImageGen] Menghasilkan gambar menggunakan Local AI pada ${this.localSdUrl}...`);
        const result = await this.generateViaLocalSd(effectivePrompt, width, height, seed, cacheKey);
        result.enhancedPrompt = effectivePrompt;
        return result;
      } catch (err: any) {
        logger.warn(`[ImageGen] Gagal generate via Local SD, beralih ke fallback: ${err?.message || err}`);
      }
    }

    // 2. Coba Hugging Face jika ada token
    if (this.hfToken) {
      try {
        const result = await this.generateViaHuggingFace(effectivePrompt, width, height, cacheKey);
        result.enhancedPrompt = effectivePrompt;
        return result;
      } catch (err: any) {
        logger.warn(`[ImageGen] Gagal generate via Hugging Face, beralih ke fallback: ${err?.message || err}`);
      }
    }

    // 3. Fallback ke Pollinations (Gratis, tanpa API key)
    try {
      const result = await this.generateViaPollinations(effectivePrompt, width, height, seed, cacheKey);
      result.enhancedPrompt = effectivePrompt;
      return result;
    } catch (err: any) {
      logger.error(`[ImageGen] Gagal generate via Pollinations fallback: ${err?.message || err}`);
      throw new Error('Gagal menghasilkan gambar melalui semua provider gratis');
    }
  }

  private async checkLocalSdAvailable(): Promise<boolean> {
    if (!this.localSdUrl) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${this.localSdUrl}/sdapi/v1/options`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async generateViaLocalSd(prompt: string, width: number, height: number, seed: number, cacheKey: string): Promise<ImageGenerationResult> {
    const endpoint = `${this.localSdUrl}/sdapi/v1/txt2img`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: 'blurry, low quality, distorted, bad anatomy, deformed',
        width,
        height,
        seed,
        steps: 20,
        cfg_scale: 7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local SD Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const base64Image = data?.images?.[0];
    if (!base64Image) {
      throw new Error('Local SD tidak mengembalikan data gambar');
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const filePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);
    await fs.promises.writeFile(filePath, buffer);

    return {
      imageUrl: `/api/ai/images/${cacheKey}.jpg`,
      mimeType: 'image/jpeg',
      provider: 'local-sd',
      imageId: cacheKey,
    };
  }

  private async generateViaHuggingFace(prompt: string, width: number, height: number, cacheKey: string): Promise<ImageGenerationResult> {
    const endpoint = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width, height }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HF Error (${response.status}): ${errText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);
    await fs.promises.writeFile(filePath, buffer);

    return {
      imageUrl: `/api/ai/images/${cacheKey}.jpg`,
      mimeType: response.headers.get('content-type') || 'image/jpeg',
      provider: 'huggingface',
      imageId: cacheKey,
    };
  }

  private async generateViaPollinations(prompt: string, width: number, height: number, seed: number, cacheKey: string): Promise<ImageGenerationResult> {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Pollinations Error (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);
    await fs.promises.writeFile(filePath, buffer);

    return {
      imageUrl: `/api/ai/images/${cacheKey}.jpg`,
      mimeType: response.headers.get('content-type') || 'image/jpeg',
      provider: 'pollinations',
      imageId: cacheKey,
    };
  }

  getImagePath(imageId: string): string | null {
    // Sanitasi imageId hanya karakter hex alfanumerik untuk mencegah directory traversal
    if (!/^[a-f0-9]{64}$/.test(imageId)) {
      return null;
    }
    const filePath = path.join(CACHE_DIR, `${imageId}.jpg`);
    return fs.existsSync(filePath) ? filePath : null;
  }
}

export const imageGenerationService = new ImageGenerationService();
