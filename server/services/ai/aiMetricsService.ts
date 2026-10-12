import { aiCostCalculator } from './aiCostCalculator.js';
import type { ProviderId } from '../../../shared/aiModelContract.js';

export interface RequestMetric {
  requestId: string;
  timestamp: number;
  ttfbMs: number;
  totalLatencyMs: number;
  inputChars: number;
  estimatedInputTokens: number;
  outputChars: number;
  estimatedOutputTokens: number;
  contextSavedTokens: number;
  modelUsed: string;
  provider?: ProviderId | string;
  isFallback: boolean;
  aborted: boolean;
  routingMode?: 'manual' | 'auto';
  routeReason?: string;
  estimatedCostUsd?: number;
  actualInputTokens?: number;
  actualOutputTokens?: number;
  isUsageEstimated?: boolean;
}

export interface MetricsSummary {
  totalRequests: number;
  avgTTFBMs: number;
  avgTotalLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalContextSavedTokens: number;
  totalEstimatedCostUsd: number;
  abortCount: number;
  fallbackCount: number;
  recentMetricsCount: number;
}

const MAX_BUFFER_SIZE = 500;
const metricsBuffer: RequestMetric[] = [];

export const aiMetricsService = {
  estimateTokens(text: string): number {
    if (!text) return 0;
    // Approximates token count: ~4 characters per token for English/Indonesian text
    return Math.ceil(text.length / 4);
  },

  recordRequestMetric(metric: Omit<RequestMetric, 'timestamp'>): void {
    const inputTokens = metric.actualInputTokens ?? metric.estimatedInputTokens;
    const outputTokens = metric.actualOutputTokens ?? metric.estimatedOutputTokens;
    const costInfo = aiCostCalculator.calculateCost(metric.modelUsed, inputTokens, outputTokens);

    const fullMetric: RequestMetric = {
      ...metric,
      estimatedCostUsd: metric.estimatedCostUsd ?? costInfo.estimatedCostUsd,
      isUsageEstimated: metric.actualInputTokens == null,
      timestamp: Date.now()
    };

    metricsBuffer.push(fullMetric);
    if (metricsBuffer.length > MAX_BUFFER_SIZE) {
      metricsBuffer.shift();
    }
    console.info(JSON.stringify({
      level: "info",
      event: "AI_REQUEST_METRIC",
      timestamp: fullMetric.timestamp,
      ttfbMs: fullMetric.ttfbMs,
      totalLatencyMs: fullMetric.totalLatencyMs,
      modelUsed: fullMetric.modelUsed,
      provider: fullMetric.provider,
      routingMode: fullMetric.routingMode,
      routeReason: fullMetric.routeReason,
      aborted: fullMetric.aborted,
      isFallback: fullMetric.isFallback,
      inputTokens: fullMetric.estimatedInputTokens,
      outputTokens: fullMetric.estimatedOutputTokens,
      estimatedCostUsd: fullMetric.estimatedCostUsd,
      isUsageEstimated: fullMetric.isUsageEstimated
    }));
  },

  getMetricsSummary(): MetricsSummary {
    if (metricsBuffer.length === 0) {
      return {
        totalRequests: 0,
        avgTTFBMs: 0,
        avgTotalLatencyMs: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalContextSavedTokens: 0,
        totalEstimatedCostUsd: 0,
        abortCount: 0,
        fallbackCount: 0,
        recentMetricsCount: 0
      };
    }

    let sumTTFB = 0;
    let sumLatency = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalContextSaved = 0;
    let totalCost = 0;
    let abortCount = 0;
    let fallbackCount = 0;

    for (const m of metricsBuffer) {
      sumTTFB += m.ttfbMs;
      sumLatency += m.totalLatencyMs;
      totalInputTokens += m.actualInputTokens ?? m.estimatedInputTokens;
      totalOutputTokens += m.actualOutputTokens ?? m.estimatedOutputTokens;
      totalContextSaved += m.contextSavedTokens;
      totalCost += m.estimatedCostUsd || 0;
      if (m.aborted) abortCount++;
      if (m.isFallback) fallbackCount++;
    }

    const count = metricsBuffer.length;

    return {
      totalRequests: count,
      avgTTFBMs: Math.round(sumTTFB / count),
      avgTotalLatencyMs: Math.round(sumLatency / count),
      totalInputTokens,
      totalOutputTokens,
      totalContextSavedTokens: totalContextSaved,
      totalEstimatedCostUsd: Number(totalCost.toFixed(6)),
      abortCount,
      fallbackCount,
      recentMetricsCount: count
    };
  },

  clearMetrics(): void {
    metricsBuffer.length = 0;
  }
};
