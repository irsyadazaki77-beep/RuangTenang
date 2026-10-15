import { getGenAIClient } from '../../config/aiConfig.js';
import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import { openaiService } from '../ai/openaiService.js';
import { geminiAdapter } from '../ai/geminiAdapter.js';

export interface VisualExtractionOptions {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  purpose?: 'document_ocr' | 'diagram_analysis' | 'screenshot_analysis';
  abortSignal?: AbortSignal;
}

export interface VisualExtractionResult {
  text: string;
  isVisualExtraction: boolean;
  ocrConfidence: number;
  readingUncertainty?: string;
  modelUsed: string;
}

const OCR_PROMPT = `Lakukan Optical Character Recognition (OCR) dan ekstraksi teks yang akurat dari gambar/halaman dokumen ini.
Pedoman penting:
1. Ekstrak teks persis seperti yang tertulis (termasuk kode, judul, paragraf, label diagram, atau pesan error).
2. Jangan pernah mengarang teks yang kabur, terpotong, atau tidak terbaca.
3. Jika terdapat bagian yang tidak terbaca, tandai dengan: [BAGIAN_TIDAK_TERBACA].
4. Berikan hasil ekstraksi teks yang bersih tanpa pembuka atau penutup basa-basi.`;

/**
 * Executes tiered visual document / image OCR and understanding using configured vision providers.
 * Returns null if no vision provider is configured, preserving honest preview-only behavior without hallucinations.
 */
export async function performVisualOcr(options: VisualExtractionOptions): Promise<VisualExtractionResult | null> {
  const { buffer, mimeType, abortSignal } = options;
  if (abortSignal?.aborted) return null;

  const base64Data = buffer.toString('base64');

  // Tier 1: Gemini Vision
  const geminiClient = getGenAIClient();
  if (geminiClient) {
    try {
      const response = await geminiAdapter.generate(geminiClient, {
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: OCR_PROMPT },
              {
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 1500,
          abortSignal
        }
      });

      const extracted = (response.text || '').trim();
      if (extracted) {
        const hasUncertainty = extracted.includes('[BAGIAN_TIDAK_TERBACA]');
        return {
          text: extracted,
          isVisualExtraction: true,
          ocrConfidence: hasUncertainty ? 0.75 : 0.95,
          readingUncertainty: hasUncertainty ? 'Sebagian teks pada gambar/halaman dokumen tidak dapat dibaca dengan jelas.' : undefined,
          modelUsed: 'gemini-3.8-flash'
        };
      }
    } catch (err: any) {
      if (abortSignal?.aborted) throw err;
      console.warn('[VISUAL_OCR] Gemini OCR extraction attempt failed:', err.message);
    }
  }

  // Tier 2: OpenAI Vision
  if (openaiService.isAvailable() && aiProviderConfig.isConfigured('openai')) {
    try {
      const response = await openaiService.generateResponse({
        requestedModelId: 'openai-gpt-5-mini',
        prompt: OCR_PROMPT,
        attachments: [
          {
            base64: base64Data,
            mimeType
          }
        ],
        abortSignal,
        maxOutputTokens: 1500
      }, 'openai-gpt-5-mini');

      const extracted = (response.text || '').trim();
      if (extracted) {
        const hasUncertainty = extracted.includes('[BAGIAN_TIDAK_TERBACA]');
        return {
          text: extracted,
          isVisualExtraction: true,
          ocrConfidence: hasUncertainty ? 0.75 : 0.92,
          readingUncertainty: hasUncertainty ? 'Sebagian teks pada gambar/halaman dokumen tidak dapat dibaca dengan jelas.' : undefined,
          modelUsed: 'openai-gpt-5-mini'
        };
      }
    } catch (err: any) {
      if (abortSignal?.aborted) throw err;
      console.warn('[VISUAL_OCR] OpenAI OCR extraction attempt failed:', err.message);
    }
  }

  return null;
}
