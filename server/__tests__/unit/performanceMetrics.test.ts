import { afterEach, describe, expect, it } from 'vitest';
import { metricsService } from '../../services/metricsService.js';
import { aiMetricsService } from '../../services/ai/aiMetricsService.js';

describe('performance metrics', () => {
  afterEach(() => {
    metricsService.reset();
    aiMetricsService.clearMetrics();
  });

  it('exposes bounded latency percentiles by HTTP route class and includes failed DB queries', () => {
    metricsService.recordHttpRequest(200, 100, 'ai_stream');
    metricsService.recordHttpRequest(200, 500, 'ai_stream');
    metricsService.recordHttpRequest(500, 900, '/patient/123');
    metricsService.recordDbQuery(true, 10);
    metricsService.recordDbQuery(false, 0);

    const snapshot = metricsService.getSnapshot();

    expect(snapshot.http.p50LatencyMs).toBe(500);
    expect(snapshot.http.p95LatencyMs).toBe(900);
    expect(snapshot.http.latencyByRouteClass.ai_stream.p95LatencyMs).toBe(500);
    expect(snapshot.http.latencyByRouteClass.other.sampleCount).toBe(1);
    expect(snapshot.database.totalQueries).toBe(2);
    expect(snapshot.database.errors).toBe(1);
  });

  it('stores consented client timings only as low-cardinality histograms', () => {
    metricsService.recordClientPerformanceSample({
      name: 'LCP',
      value: 1_250,
      route: 'workspace',
      device: 'mobile',
      navigationType: 'navigate'
    });
    metricsService.recordClientPerformanceSample({
      name: 'CLS',
      value: 0.06,
      route: 'workspace',
      device: 'mobile',
      navigationType: 'navigate'
    });

    const snapshot = metricsService.getSnapshot();
    const exposition = metricsService.toPrometheusText();

    expect(snapshot.clientPerformance.totalSamples).toBe(2);
    expect(snapshot.clientPerformance.sampleCountsByMetric).toEqual({ LCP: 1, CLS: 1 });
    expect(exposition).toContain('ruangtenang_web_vital_lcp_ms_bucket{route="workspace",device="mobile",navigation_type="navigate",le="2500"} 1');
    expect(exposition).not.toContain('patient');
    expect(exposition).not.toContain('123');
  });

  it('calculates AI latency percentiles separately for each bounded provider', () => {
    for (const [provider, latency] of [['openai', 100], ['openai', 500], ['unknown-secret-provider', 900]] as const) {
      aiMetricsService.recordRequestMetric({
        requestId: 'private-request-id',
        ttfbMs: latency / 2,
        totalLatencyMs: latency,
        inputChars: 0,
        estimatedInputTokens: 0,
        outputChars: 0,
        estimatedOutputTokens: 0,
        contextSavedTokens: 0,
        modelUsed: 'test-model',
        provider,
        isFallback: false,
        aborted: false
      });
    }

    const summary = aiMetricsService.getMetricsSummary();
    const exposition = aiMetricsService.toPrometheusText();

    expect(summary.latencyByProvider.openai.p50TotalLatencyMs).toBe(100);
    expect(summary.latencyByProvider.openai.p95TotalLatencyMs).toBe(500);
    expect(summary.latencyByProvider.unknown.sampleCount).toBe(1);
    expect(exposition).not.toContain('unknown-secret-provider');
    expect(exposition).not.toContain('private-request-id');
  });
});
