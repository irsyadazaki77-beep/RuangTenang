import { GoogleGenAI } from '@google/genai';
import { getGenAIClient } from '../../config/aiConfig.js';

type GenerateInput = Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'> & { model: string };
type StreamInput = Omit<Parameters<GoogleGenAI['models']['generateContentStream']>[0], 'model'> & { model: string };

/** Thin adapter around the existing Gemini SDK client; request policy stays in AiRequestService. */
export class GeminiAdapter {
  readonly provider = 'gemini' as const;

  isAvailable(): boolean { return getGenAIClient() !== null; }

  generate(client: GoogleGenAI, input: GenerateInput) {
    return client.models.generateContent(input);
  }

  generateStream(client: GoogleGenAI, input: StreamInput) {
    return client.models.generateContentStream(input);
  }
}

export const geminiAdapter = new GeminiAdapter();
