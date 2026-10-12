export interface ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

/**
 * Standard published API pricing table per provider/model (USD per 1M tokens).
 * Official list pricing as published:
 * - Gemini 3.8 Flash / 3.5 Flash: $0.10 / $0.40 per 1M tokens (Standard prompt tier)
 * - Gemini 3.5 Flash Lite / 3.1 Flash Lite: $0.075 / $0.30 per 1M tokens
 * - Gemini 3.5 Pro / 3.1 Pro: $1.25 / $5.00 per 1M tokens
 * - DeepSeek V3 (Chat): $0.14 / $0.28 per 1M tokens
 * - DeepSeek R1 (Reasoner): $0.55 / $2.19 per 1M tokens
 * - Groq (Qwen 27B / GPT-OSS 20B): $0.20 / $0.20 per 1M tokens
 * - Groq (GPT-OSS 120B): $0.50 / $0.50 per 1M tokens
 * - OpenRouter free tier models (:free suffix): $0.00 / $0.00
 * - OpenAI GPT-4o-mini: $0.15 / $0.60 per 1M tokens
 * - OpenAI GPT-4o: $2.50 / $10.00 per 1M tokens
 */
export const MODEL_PRICING_REGISTRY: Readonly<Record<string, ModelPricing>> = Object.freeze({
  // Gemini Models
  'gemini-3.8-flash': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40 },
  'gemini-3.7-flash': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40 },
  'gemini-3.5-flash': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40 },
  'gemini-flash-latest': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40 },
  'gemini-3.5-flash-lite': { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.30 },
  'gemini-3.1-flash-lite': { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.30 },
  'gemini-3.5-pro': { inputPerMillionUsd: 1.25, outputPerMillionUsd: 5.00 },
  'gemini-3.1-pro-preview': { inputPerMillionUsd: 1.25, outputPerMillionUsd: 5.00 },

  // DeepSeek Models
  'deepseek-chat': { inputPerMillionUsd: 0.14, outputPerMillionUsd: 0.28 },
  'deepseek-reasoner': { inputPerMillionUsd: 0.55, outputPerMillionUsd: 2.19 },

  // Groq Models
  'groq-qwen-27b': { inputPerMillionUsd: 0.20, outputPerMillionUsd: 0.20 },
  'groq-gpt-20b': { inputPerMillionUsd: 0.20, outputPerMillionUsd: 0.20 },
  'groq-gpt-120b': { inputPerMillionUsd: 0.50, outputPerMillionUsd: 0.50 },

  // OpenRouter Free Models
  'openrouter-nemotron-550b': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0 },
  'openrouter-nemotron-super-120b': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0 },
  'openrouter-nemotron-lightning': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0 },
  'openrouter-cohere-code': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0 },
  'openrouter-ling-flash': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0 },

  // OpenAI Models
  'openai-gpt-4o-mini': { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.60 },
  'openai-gpt-4o': { inputPerMillionUsd: 2.50, outputPerMillionUsd: 10.00 }
});

export const FALLBACK_DEFAULT_PRICING: ModelPricing = {
  inputPerMillionUsd: 0.10,
  outputPerMillionUsd: 0.40
};

export const aiCostCalculator = {
  /**
   * Calculates estimated cost in USD based on official pricing registry.
   */
  calculateCost(modelId: string, inputTokens: number, outputTokens: number): {
    estimatedCostUsd: number;
    inputCostUsd: number;
    outputCostUsd: number;
    isPricingKnown: boolean;
  } {
    const pricing = MODEL_PRICING_REGISTRY[modelId];
    const isPricingKnown = Boolean(pricing);
    const activePricing = pricing || FALLBACK_DEFAULT_PRICING;

    const inputCostUsd = (inputTokens / 1_000_000) * activePricing.inputPerMillionUsd;
    const outputCostUsd = (outputTokens / 1_000_000) * activePricing.outputPerMillionUsd;
    const estimatedCostUsd = Number((inputCostUsd + outputCostUsd).toFixed(8));

    return {
      estimatedCostUsd,
      inputCostUsd: Number(inputCostUsd.toFixed(8)),
      outputCostUsd: Number(outputCostUsd.toFixed(8)),
      isPricingKnown
    };
  },

  getPricing(modelId: string): ModelPricing | undefined {
    return MODEL_PRICING_REGISTRY[modelId];
  }
};
