export type PricingStatus = 'verified' | 'estimated' | 'unknown';

export interface ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  pricingStatus: PricingStatus;
  source: string;
  validatedDate: string; // ISO date string YYYY-MM-DD
}

/**
 * Standard published API pricing table per provider/model (USD per 1M tokens).
 * Explicitly separates verified official published rates, community-estimated rates, and unknown fallbacks.
 */
export const MODEL_PRICING_REGISTRY: Readonly<Record<string, ModelPricing>> = Object.freeze({
  // Gemini Models (Source: Google Cloud Vertex AI & Google AI Studio pricing, verified 2026-03)
  'gemini-3.8-flash': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-3.7-flash': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-3.5-flash': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-flash-latest': { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-3.5-flash-lite': { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.30, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-3.1-flash-lite': { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.30, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-3.5-pro': { inputPerMillionUsd: 1.25, outputPerMillionUsd: 5.00, pricingStatus: 'verified', source: 'Google AI Studio Pricing', validatedDate: '2026-03-01' },
  'gemini-3.1-pro-preview': { inputPerMillionUsd: 1.25, outputPerMillionUsd: 5.00, pricingStatus: 'estimated', source: 'Google Cloud Preview Pricing Tier', validatedDate: '2026-03-01' },

  // DeepSeek Models (Source: DeepSeek Platform Official Pricing, verified 2026-02)
  'deepseek-chat': { inputPerMillionUsd: 0.14, outputPerMillionUsd: 0.28, pricingStatus: 'verified', source: 'DeepSeek Platform Pricing (V3)', validatedDate: '2026-02-15' },
  'deepseek-reasoner': { inputPerMillionUsd: 0.55, outputPerMillionUsd: 2.19, pricingStatus: 'verified', source: 'DeepSeek Platform Pricing (R1)', validatedDate: '2026-02-15' },

  // Groq Models (Source: Groq Cloud Official Pricing, verified 2026-02)
  'groq-qwen-27b': { inputPerMillionUsd: 0.20, outputPerMillionUsd: 0.20, pricingStatus: 'verified', source: 'Groq Cloud Official Rates', validatedDate: '2026-02-20' },
  'groq-gpt-20b': { inputPerMillionUsd: 0.20, outputPerMillionUsd: 0.20, pricingStatus: 'verified', source: 'Groq Cloud Official Rates', validatedDate: '2026-02-20' },
  'groq-gpt-120b': { inputPerMillionUsd: 0.50, outputPerMillionUsd: 0.50, pricingStatus: 'verified', source: 'Groq Cloud Official Rates', validatedDate: '2026-02-20' },

  // OpenRouter Free Models (Source: OpenRouter catalog, verified 2026-03)
  'openrouter-nemotron-550b': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0, pricingStatus: 'verified', source: 'OpenRouter Free Model Tier', validatedDate: '2026-03-01' },
  'openrouter-nemotron-super-120b': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0, pricingStatus: 'verified', source: 'OpenRouter Free Model Tier', validatedDate: '2026-03-01' },
  'openrouter-nemotron-lightning': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0, pricingStatus: 'verified', source: 'OpenRouter Free Model Tier', validatedDate: '2026-03-01' },
  'openrouter-cohere-code': { inputPerMillionUsd: 0.0, outputPerMillionUsd: 0.0, pricingStatus: 'verified', source: 'OpenRouter Free Model Tier', validatedDate: '2026-03-01' },
  'openrouter-ling-flash': { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.225, pricingStatus: 'verified', source: 'OpenRouter Models API', validatedDate: '2026-10-14' },

  // OpenAI Models (Source: OpenAI API Pricing, verified 2026-02)
  'openai-gpt-4o-mini': { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.60, pricingStatus: 'verified', source: 'OpenAI Standard API Pricing', validatedDate: '2026-02-01' },
  'openai-gpt-4o': { inputPerMillionUsd: 2.50, outputPerMillionUsd: 10.00, pricingStatus: 'verified', source: 'OpenAI Standard API Pricing', validatedDate: '2026-02-01' }
});

export const FALLBACK_DEFAULT_PRICING: ModelPricing = {
  inputPerMillionUsd: 0.10,
  outputPerMillionUsd: 0.40,
  pricingStatus: 'unknown',
  source: 'System Fallback Standard Baseline',
  validatedDate: '2026-01-01'
};

export interface CostCalculationResult {
  actualCostUsd: number | null; // null if pricing is unknown (prevents showing fallback as actual cost)
  estimatedCostUsd: number;
  inputCostUsd: number;
  outputCostUsd: number;
  pricingStatus: PricingStatus;
  isPricingKnown: boolean;
  pricingSource: string;
  validatedDate: string;
}

export const aiCostCalculator = {
  /**
   * Calculates cost in USD.
   * If model pricing is unknown, returns actualCostUsd: null to avoid presenting fallback as actual spend.
   */
  calculateCost(modelId: string, inputTokens: number, outputTokens: number): CostCalculationResult {
    const pricing = MODEL_PRICING_REGISTRY[modelId];
    const isPricingKnown = Boolean(pricing);
    const activePricing = pricing || FALLBACK_DEFAULT_PRICING;

    const inputCostUsd = (inputTokens / 1_000_000) * activePricing.inputPerMillionUsd;
    const outputCostUsd = (outputTokens / 1_000_000) * activePricing.outputPerMillionUsd;
    const estimatedCostUsd = Number((inputCostUsd + outputCostUsd).toFixed(8));

    // Only set actualCostUsd if pricing is officially known/verified or estimated
    const actualCostUsd = isPricingKnown ? estimatedCostUsd : null;

    return {
      actualCostUsd,
      estimatedCostUsd,
      inputCostUsd: Number(inputCostUsd.toFixed(8)),
      outputCostUsd: Number(outputCostUsd.toFixed(8)),
      pricingStatus: activePricing.pricingStatus,
      isPricingKnown,
      pricingSource: activePricing.source,
      validatedDate: activePricing.validatedDate
    };
  },

  getPricing(modelId: string): ModelPricing | undefined {
    return MODEL_PRICING_REGISTRY[modelId];
  }
};
