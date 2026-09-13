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
  isFallback: boolean;
  aborted: boolean;
}

export interface MetricsSummary {
  totalRequests: number;
  avgTTFBMs: number;
  avgTotalLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalContextSavedTokens: number;
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
    const fullMetric: RequestMetric = {
      ...metric,
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
      aborted: fullMetric.aborted,
      isFallback: fullMetric.isFallback,
      inputTokens: fullMetric.estimatedInputTokens,
      outputTokens: fullMetric.estimatedOutputTokens
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
    let abortCount = 0;
    let fallbackCount = 0;

    for (const m of metricsBuffer) {
      sumTTFB += m.ttfbMs;
      sumLatency += m.totalLatencyMs;
      totalInputTokens += m.estimatedInputTokens;
      totalOutputTokens += m.estimatedOutputTokens;
      totalContextSaved += m.contextSavedTokens;
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
      abortCount,
      fallbackCount,
      recentMetricsCount: count
    };
  },

  clearMetrics(): void {
    metricsBuffer.length = 0;
  }
};
