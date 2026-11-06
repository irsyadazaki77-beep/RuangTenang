import { GoogleGenAI } from '@google/genai';
import { getGenAIClient } from '../../config/aiConfig.js';

type GenerateInput = Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'> & { model: string };
type StreamInput = Omit<Parameters<GoogleGenAI['models']['generateContentStream']>[0], 'model'> & { model: string };

/**
 * Maps RuangTenang internal model aliases (e.g. gemini-3.8-flash, gemini-4-argon, gemini-3.5-flash-lite)
 * to valid Google GenAI API model identifiers so SDK calls do not fail with 404 Not Found.
 */
export function resolveGeminiSdkModel(modelId: string): string {
  switch (modelId) {
    case 'gemini-4-argon':
    case 'gemini-3.5-pro':
    case 'gemini-3.1-pro-preview':
    case 'gemini-2.5-pro':
      return 'gemini-4-argon';
    case 'gemini-3.8-flash':
    case 'gemini-3.7-flash':
    case 'gemini-3.6-flash':
    case 'gemini-3.5-flash':
    case 'gemini-3-flash-preview':
    case 'gemini-2.5-flash':
      return 'gemini-3.8-flash';
    case 'gemini-3.1-flash-lite':
    case 'gemini-3.5-flash-lite':
      return 'gemini-3.1-flash-lite';
    case 'gemini-3.8-flash-lite-tts':
    case 'gemini-2.5-flash-preview-tts':
      return 'gemini-3.8-flash-lite-tts';
    default:
      if (modelId.startsWith('gemini-3.8') || modelId.startsWith('gemini-3.5') || modelId.startsWith('gemini-3')) {
        return 'gemini-3.8-flash';
      }
      if (modelId.startsWith('gemini-4')) {
        return 'gemini-4-argon';
      }
      return modelId;
  }
}

/** Thin adapter around the existing Gemini SDK client; request policy stays in AiRequestService. */
export class GeminiAdapter {
  readonly provider = 'gemini' as const;

  isAvailable(): boolean { return getGenAIClient() !== null; }

  generate(client: GoogleGenAI, input: GenerateInput) {
    return client.models.generateContent({
      ...input,
      model: resolveGeminiSdkModel(input.model),
    });
  }

  generateStream(client: GoogleGenAI, input: StreamInput) {
    return client.models.generateContentStream({
      ...input,
      model: resolveGeminiSdkModel(input.model),
    });
  }
}

export const geminiAdapter = new GeminiAdapter();

