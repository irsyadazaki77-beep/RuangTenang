import { aiCostCalculator } from './aiCostCalculator.js';
import { metricsService } from '../metricsService.js';
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
  actualCostUsd?: number | null;
  pricingStatus?: 'verified' | 'estimated' | 'unknown';
  actualInputTokens?: number;
  actualOutputTokens?: number;
  isUsageEstimated?: boolean;
}

export interface MetricsSummary {
  totalRequests: number;
  avgTTFBMs: number;
  p50TTFBMs: number;
  p75TTFBMs: number;
  p95TTFBMs: number;
  avgTotalLatencyMs: number;
  p50TotalLatencyMs: number;
  p95TotalLatencyMs: number;
  latencyByProvider: Record<string, {
    sampleCount: number;
    p50TTFBMs: number;
    p75TTFBMs: number;
    p95TTFBMs: number;
    p50TotalLatencyMs: number;
    p95TotalLatencyMs: number;
  }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalContextSavedTokens: number;
  totalEstimatedCostUsd: number;
  totalActualCostUsd: number;
  abortCount: number;
  fallbackCount: number;
  recentMetricsCount: number;
}

const MAX_BUFFER_SIZE = 2000;
const metricsBuffer: RequestMetric[] = [];
const KNOWN_PROVIDERS = new Set(['gemini', 'openai', 'deepseek', 'groq', 'openrouter', 'ollama', 'local']);

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)]);
}

function providerBucket(provider?: string): string {
  const normalized = provider?.toLowerCase() || 'unknown';
  return KNOWN_PROVIDERS.has(normalized) ? normalized : 'unknown';
}

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
      actualCostUsd: metric.actualCostUsd !== undefined ? metric.actualCostUsd : costInfo.actualCostUsd,
      pricingStatus: metric.pricingStatus ?? costInfo.pricingStatus,
      isUsageEstimated: metric.actualInputTokens == null,
      timestamp: Date.now()
    };

    metricsBuffer.push(fullMetric);
    if (metricsBuffer.length > MAX_BUFFER_SIZE) {
      metricsBuffer.shift();
    }
    metricsService.recordAiCall(!fullMetric.aborted, fullMetric.totalLatencyMs);
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
        p50TTFBMs: 0,
        p75TTFBMs: 0,
        p95TTFBMs: 0,
        avgTotalLatencyMs: 0,
        p50TotalLatencyMs: 0,
        p95TotalLatencyMs: 0,
        latencyByProvider: {},
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalContextSavedTokens: 0,
        totalEstimatedCostUsd: 0,
        totalActualCostUsd: 0,
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
    let totalActualCost = 0;
    let abortCount = 0;
    let fallbackCount = 0;

    for (const m of metricsBuffer) {
      sumTTFB += m.ttfbMs;
      sumLatency += m.totalLatencyMs;
      totalInputTokens += m.actualInputTokens ?? m.estimatedInputTokens;
      totalOutputTokens += m.actualOutputTokens ?? m.estimatedOutputTokens;
      totalContextSaved += m.contextSavedTokens;
      totalCost += m.estimatedCostUsd || 0;
      if (m.actualCostUsd != null) totalActualCost += m.actualCostUsd;
      if (m.aborted) abortCount++;
      if (m.isFallback) fallbackCount++;
    }

    const count = metricsBuffer.length;
    const ttfbValues = metricsBuffer.map(metric => metric.ttfbMs);
    const latencyValues = metricsBuffer.map(metric => metric.totalLatencyMs);
    const providerMetrics = new Map<string, RequestMetric[]>();
    for (const metric of metricsBuffer) {
      const key = providerBucket(metric.provider);
      const values = providerMetrics.get(key) || [];
      values.push(metric);
      providerMetrics.set(key, values);
    }
    const latencyByProvider = Object.fromEntries([...providerMetrics.entries()].map(([provider, values]) => {
      const providerTtfb = values.map(metric => metric.ttfbMs);
      const providerLatency = values.map(metric => metric.totalLatencyMs);
      return [provider, {
        sampleCount: values.length,
        p50TTFBMs: percentile(providerTtfb, 0.5),
        p75TTFBMs: percentile(providerTtfb, 0.75),
        p95TTFBMs: percentile(providerTtfb, 0.95),
        p50TotalLatencyMs: percentile(providerLatency, 0.5),
        p95TotalLatencyMs: percentile(providerLatency, 0.95)
      }];
    }));

    return {
      totalRequests: count,
      avgTTFBMs: Math.round(sumTTFB / count),
      p50TTFBMs: percentile(ttfbValues, 0.5),
      p75TTFBMs: percentile(ttfbValues, 0.75),
      p95TTFBMs: percentile(ttfbValues, 0.95),
      avgTotalLatencyMs: Math.round(sumLatency / count),
      p50TotalLatencyMs: percentile(latencyValues, 0.5),
      p95TotalLatencyMs: percentile(latencyValues, 0.95),
      latencyByProvider,
      totalInputTokens,
      totalOutputTokens,
      totalContextSavedTokens: totalContextSaved,
      totalEstimatedCostUsd: Number(totalCost.toFixed(6)),
      totalActualCostUsd: Number(totalActualCost.toFixed(6)),
      abortCount,
      fallbackCount,
      recentMetricsCount: count
    };
  },

  toPrometheusText(): string {
    const summary = this.getMetricsSummary();
    const lines = [
      '# HELP ruangtenang_ai_ttft_ms Time to first generated token in milliseconds.',
      '# TYPE ruangtenang_ai_ttft_ms gauge',
      `ruangtenang_ai_ttft_ms{quantile="0.5"} ${summary.p50TTFBMs}`,
      `ruangtenang_ai_ttft_ms{quantile="0.75"} ${summary.p75TTFBMs}`,
      `ruangtenang_ai_ttft_ms{quantile="0.95"} ${summary.p95TTFBMs}`,
      '# HELP ruangtenang_ai_total_latency_ms Completed AI request latency in milliseconds.',
      '# TYPE ruangtenang_ai_total_latency_ms gauge',
      `ruangtenang_ai_total_latency_ms{quantile="0.5"} ${summary.p50TotalLatencyMs}`,
      `ruangtenang_ai_total_latency_ms{quantile="0.95"} ${summary.p95TotalLatencyMs}`
    ];
    for (const [provider, values] of Object.entries(summary.latencyByProvider) as Array<[string, MetricsSummary['latencyByProvider'][string]]>) {
      lines.push(`ruangtenang_ai_ttft_ms{provider="${provider}",quantile="0.5"} ${values.p50TTFBMs}`);
      lines.push(`ruangtenang_ai_ttft_ms{provider="${provider}",quantile="0.75"} ${values.p75TTFBMs}`);
      lines.push(`ruangtenang_ai_ttft_ms{provider="${provider}",quantile="0.95"} ${values.p95TTFBMs}`);
      lines.push(`ruangtenang_ai_total_latency_ms{provider="${provider}",quantile="0.5"} ${values.p50TotalLatencyMs}`);
      lines.push(`ruangtenang_ai_total_latency_ms{provider="${provider}",quantile="0.95"} ${values.p95TotalLatencyMs}`);
    }
    return lines.join('\n');
  },

  clearMetrics(): void {
    metricsBuffer.length = 0;
  }
};
