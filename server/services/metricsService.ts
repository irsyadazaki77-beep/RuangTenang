/**
 * RuangTenang Observability & Metrics Service
 * Tracks operational telemetry including latency, error rates, AI performance,
 * database query health, booking conflicts, and emergency SOS dispatches.
 */

export interface SystemMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  http: {
    totalRequests: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    rate5xxPercentage: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    latencyByRouteClass: Record<string, { sampleCount: number; p50LatencyMs: number; p95LatencyMs: number }>;
  };
  ai: {
    totalRequests: number;
    failures: number;
    failureRatePercentage: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  };
  database: {
    totalQueries: number;
    errors: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  };
  clientPerformance: {
    totalSamples: number;
    sampleCountsByMetric: Record<string, number>;
  };
  appointments: {
    totalAttempts: number;
    conflicts: number;
    conflictRatePercentage: number;
  };
  emergencySos: {
    mockDispatches: number;
    realDispatches: number;
    lastDispatchTimestamp?: string;
  };
  auth: {
    browserCookieSessions: number;
    legacyBearerSessions: number;
    mobileSessions: number;
    mobileRefreshSuccesses: number;
    mobileRefreshFailures: number;
    mobileRefreshReplays: number;
    mobileLogouts: number;
    mobileClientVersions: Record<string, { sessions: number; refreshSuccesses: number; refreshFailures: number }>;
  };
  security: {
    csrfRejections: number;
    cspViolationReports: number;
    rateLimitExceeded: number;
  };
}

export type ClientPerformanceMetricName = 'LCP' | 'INP' | 'CLS' | 'AI_TTFT' | 'AI_TOTAL';
export type ClientPerformanceRoute = 'chat' | 'workspace' | 'mood' | 'screening' | 'counselors' | 'other';
export type ClientPerformanceDevice = 'mobile' | 'desktop';
export type ClientPerformanceNavigationType = 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'soft-navigation' | 'other';

const MAX_RECENT_SAMPLES = 2000;
const TIME_BUCKETS_MS = [100, 250, 500, 1000, 2500, 5000, 10000, 30000];
const CLS_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1];

interface ClientPerformanceHistogram {
  name: ClientPerformanceMetricName;
  route: ClientPerformanceRoute;
  device: ClientPerformanceDevice;
  navigationType: ClientPerformanceNavigationType;
  count: number;
  sum: number;
  buckets: number[];
}

function recordRecentSample(samples: number[], value: number): void {
  samples.push(Math.max(0, value));
  if (samples.length > MAX_RECENT_SAMPLES) samples.shift();
}

function percentile(samples: number[], quantile: number): number {
  if (samples.length === 0) return 0;
  const ordered = [...samples].sort((a, b) => a - b);
  return Number(ordered[Math.max(0, Math.ceil(quantile * ordered.length) - 1)].toFixed(2));
}

function clientMetricPrometheusName(name: ClientPerformanceMetricName): string {
  switch (name) {
    case 'LCP': return 'ruangtenang_web_vital_lcp_ms';
    case 'INP': return 'ruangtenang_web_vital_inp_ms';
    case 'CLS': return 'ruangtenang_web_vital_cls';
    case 'AI_TTFT': return 'ruangtenang_client_ai_time_to_first_token_ms';
    case 'AI_TOTAL': return 'ruangtenang_client_ai_total_latency_ms';
  }
}

class MetricsService {
  private startTime = Date.now();

  // HTTP metrics
  private totalRequests = 0;
  private status2xx = 0;
  private status4xx = 0;
  private status5xx = 0;
  private totalHttpLatencyMs = 0;
  private recentHttpLatencyMs: number[] = [];
  private recentHttpLatencyByClass = new Map<string, number[]>();

  // AI metrics
  private aiRequests = 0;
  private aiFailures = 0;
  private totalAiLatencyMs = 0;
  private recentAiLatencyMs: number[] = [];
  private recentAiStageLatencies = new Map<string, number[]>();

  // Database metrics
  private dbQueries = 0;
  private dbErrors = 0;
  private totalDbLatencyMs = 0;
  private recentDbLatencyMs: number[] = [];
  private clientPerformanceHistograms = new Map<string, ClientPerformanceHistogram>();

  // Appointments
  private bookingAttempts = 0;
  private bookingConflicts = 0;

  // SOS Dispatches
  private sosMockCount = 0;
  private sosRealCount = 0;
  private lastSosTimestamp?: string;

  private browserCookieSessions = 0;
  private legacyBearerSessions = 0;
  private mobileSessions = 0;
  private mobileRefreshSuccesses = 0;
  private mobileRefreshFailures = 0;
  private mobileRefreshReplays = 0;
  private mobileLogouts = 0;
  private mobileClientVersions: Record<string, { sessions: number; refreshSuccesses: number; refreshFailures: number }> = {};
  private csrfRejections = 0;
  private cspViolationReports = 0;
  private rateLimitExceeded = 0;

  private clientVersion(raw?: string | string[]) {
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    const sanitized = candidate && /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]{1,20})?$/.test(candidate)
      ? candidate.slice(0, 32)
      : 'unknown';
    if (this.mobileClientVersions[sanitized] || Object.keys(this.mobileClientVersions).length < 25) return sanitized;
    return 'other';
  }

  recordAuthSession(channel: 'browser_cookie' | 'legacy_bearer' | 'mobile', version?: string | string[]) {
    if (channel === 'browser_cookie') this.browserCookieSessions++;
    else if (channel === 'legacy_bearer') this.legacyBearerSessions++;
    else {
      this.mobileSessions++;
      const key = this.clientVersion(version);
      this.mobileClientVersions[key] ??= { sessions: 0, refreshSuccesses: 0, refreshFailures: 0 };
      this.mobileClientVersions[key].sessions++;
    }
  }

  recordMobileRefresh(outcome: 'success' | 'failure' | 'replay', version?: string | string[]) {
    const key = this.clientVersion(version);
    this.mobileClientVersions[key] ??= { sessions: 0, refreshSuccesses: 0, refreshFailures: 0 };
    if (outcome === 'success') {
      this.mobileRefreshSuccesses++;
      this.mobileClientVersions[key].refreshSuccesses++;
    } else {
      this.mobileRefreshFailures++;
      this.mobileClientVersions[key].refreshFailures++;
      if (outcome === 'replay') this.mobileRefreshReplays++;
    }
  }

  recordMobileLogout() { this.mobileLogouts++; }
  recordSecurityEvent(event: 'csrf_rejection' | 'csp_violation' | 'rate_limit_exceeded') {
    if (event === 'csrf_rejection') this.csrfRejections++;
    else if (event === 'csp_violation') this.cspViolationReports++;
    else this.rateLimitExceeded++;
  }

  recordHttpRequest(statusCode: number, latencyMs: number, routeClass = 'other') {
    this.totalRequests++;
    const safeLatencyMs = Math.max(0, latencyMs);
    this.totalHttpLatencyMs += safeLatencyMs;
    recordRecentSample(this.recentHttpLatencyMs, safeLatencyMs);
    const knownRouteClasses = new Set(['ai_stream', 'ai_api', 'workspace_api', 'auth', 'appointments', 'privacy', 'health', 'read_api', 'write_api', 'other']);
    const safeRouteClass = knownRouteClasses.has(routeClass) ? routeClass : 'other';
    const classSamples = this.recentHttpLatencyByClass.get(safeRouteClass) || [];
    recordRecentSample(classSamples, safeLatencyMs);
    this.recentHttpLatencyByClass.set(safeRouteClass, classSamples);
    if (statusCode >= 200 && statusCode < 300) {
      this.status2xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.status4xx++;
    } else if (statusCode >= 500) {
      this.status5xx++;
    }
  }

  recordAiCall(success: boolean, latencyMs: number) {
    this.aiRequests++;
    const safeLatencyMs = Math.max(0, latencyMs);
    this.totalAiLatencyMs += safeLatencyMs;
    recordRecentSample(this.recentAiLatencyMs, safeLatencyMs);
    if (!success) {
      this.aiFailures++;
    }
  }

  recordAiStage(stage: 'context_build' | 'provider_first_token' | 'safety_check', latencyMs: number) {
    const samples = this.recentAiStageLatencies.get(stage) || [];
    recordRecentSample(samples, latencyMs);
    this.recentAiStageLatencies.set(stage, samples);
  }

  recordDbQuery(success: boolean, latencyMs: number) {
    this.dbQueries++;
    if (success) {
      const safeLatencyMs = Math.max(0, latencyMs);
      this.totalDbLatencyMs += safeLatencyMs;
      recordRecentSample(this.recentDbLatencyMs, safeLatencyMs);
    } else this.dbErrors++;
  }

  recordDbError() {
    this.dbErrors++;
  }

  recordClientPerformanceSample(sample: {
    name: ClientPerformanceMetricName;
    value: number;
    route: ClientPerformanceRoute;
    device: ClientPerformanceDevice;
    navigationType: ClientPerformanceNavigationType;
  }) {
    const routeValues: ClientPerformanceRoute[] = ['chat', 'workspace', 'mood', 'screening', 'counselors', 'other'];
    const navigationValues: ClientPerformanceNavigationType[] = ['navigate', 'reload', 'back-forward', 'back-forward-cache', 'soft-navigation', 'other'];
    const route = routeValues.includes(sample.route) ? sample.route : 'other';
    const navigationType = navigationValues.includes(sample.navigationType) ? sample.navigationType : 'other';
    const key = `${sample.name}:${route}:${sample.device}:${navigationType}`;
    let histogram = this.clientPerformanceHistograms.get(key);
    if (!histogram) {
      histogram = {
        name: sample.name,
        route,
        device: sample.device,
        navigationType,
        count: 0,
        sum: 0,
        buckets: new Array((sample.name === 'CLS' ? CLS_BUCKETS : TIME_BUCKETS_MS).length).fill(0)
      };
      this.clientPerformanceHistograms.set(key, histogram);
    }

    const value = Math.max(0, sample.value);
    histogram.count++;
    histogram.sum += value;
    const bounds = sample.name === 'CLS' ? CLS_BUCKETS : TIME_BUCKETS_MS;
    bounds.forEach((bound, index) => { if (value <= bound) histogram!.buckets[index]++; });
  }

  recordBookingAttempt(isConflict: boolean) {
    this.bookingAttempts++;
    if (isConflict) {
      this.bookingConflicts++;
    }
  }

  recordSosDispatch(isReal: boolean) {
    if (isReal) {
      this.sosRealCount++;
    } else {
      this.sosMockCount++;
    }
    this.lastSosTimestamp = new Date().toISOString();
  }

  getSnapshot(): SystemMetricsSnapshot {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgLatencyMs = this.totalRequests > 0 ? Number((this.totalHttpLatencyMs / this.totalRequests).toFixed(2)) : 0;
    const rate5xxPercentage = this.totalRequests > 0 ? Number(((this.status5xx / this.totalRequests) * 100).toFixed(2)) : 0;

    const avgAiLatencyMs = this.aiRequests > 0 ? Number((this.totalAiLatencyMs / this.aiRequests).toFixed(2)) : 0;
    const aiFailureRatePercentage = this.aiRequests > 0 ? Number(((this.aiFailures / this.aiRequests) * 100).toFixed(2)) : 0;

    const avgDbLatencyMs = this.dbQueries > 0 ? Number((this.totalDbLatencyMs / this.dbQueries).toFixed(2)) : 0;
    const conflictRatePercentage = this.bookingAttempts > 0 ? Number(((this.bookingConflicts / this.bookingAttempts) * 100).toFixed(2)) : 0;
    const clientPerformanceSampleCounts: Record<string, number> = {};
    let clientPerformanceTotalSamples = 0;
    for (const histogram of this.clientPerformanceHistograms.values()) {
      clientPerformanceSampleCounts[histogram.name] = (clientPerformanceSampleCounts[histogram.name] || 0) + histogram.count;
      clientPerformanceTotalSamples += histogram.count;
    }

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      http: {
        totalRequests: this.totalRequests,
        status2xx: this.status2xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        rate5xxPercentage,
        avgLatencyMs,
        p50LatencyMs: percentile(this.recentHttpLatencyMs, 0.5),
        p95LatencyMs: percentile(this.recentHttpLatencyMs, 0.95),
        latencyByRouteClass: Object.fromEntries([...this.recentHttpLatencyByClass.entries()].map(([routeClass, samples]) => [routeClass, {
          sampleCount: samples.length,
          p50LatencyMs: percentile(samples, 0.5),
          p95LatencyMs: percentile(samples, 0.95)
        }]))
      },
      ai: {
        totalRequests: this.aiRequests,
        failures: this.aiFailures,
        failureRatePercentage: aiFailureRatePercentage,
        avgLatencyMs: avgAiLatencyMs,
        p50LatencyMs: percentile(this.recentAiLatencyMs, 0.5),
        p95LatencyMs: percentile(this.recentAiLatencyMs, 0.95)
      },
      database: {
        totalQueries: this.dbQueries,
        errors: this.dbErrors,
        avgLatencyMs: avgDbLatencyMs,
        p50LatencyMs: percentile(this.recentDbLatencyMs, 0.5),
        p95LatencyMs: percentile(this.recentDbLatencyMs, 0.95)
      },
      clientPerformance: {
        totalSamples: clientPerformanceTotalSamples,
        sampleCountsByMetric: clientPerformanceSampleCounts
      },
      appointments: {
        totalAttempts: this.bookingAttempts,
        conflicts: this.bookingConflicts,
        conflictRatePercentage
      },
      emergencySos: {
        mockDispatches: this.sosMockCount,
        realDispatches: this.sosRealCount,
        lastDispatchTimestamp: this.lastSosTimestamp
      },
      auth: {
        browserCookieSessions: this.browserCookieSessions,
        legacyBearerSessions: this.legacyBearerSessions,
        mobileSessions: this.mobileSessions,
        mobileRefreshSuccesses: this.mobileRefreshSuccesses,
        mobileRefreshFailures: this.mobileRefreshFailures,
        mobileRefreshReplays: this.mobileRefreshReplays,
        mobileLogouts: this.mobileLogouts,
        mobileClientVersions: { ...this.mobileClientVersions },
      },
      security: {
        csrfRejections: this.csrfRejections,
        cspViolationReports: this.cspViolationReports,
        rateLimitExceeded: this.rateLimitExceeded,
      },
    };
  }

  /**
   * Returns Prometheus-compatible exposition format
   */
  toPrometheusText(): string {
    const s = this.getSnapshot();
    const lines = [
      `# HELP http_requests_total Total number of HTTP requests processed`,
      `# TYPE http_requests_total counter`,
      `http_requests_total ${s.http.totalRequests}`,
      `http_requests_5xx_total ${s.http.status5xx}`,
      `http_request_avg_latency_ms ${s.http.avgLatencyMs}`,
      `http_request_p50_latency_ms ${s.http.p50LatencyMs}`,
      `http_request_p95_latency_ms ${s.http.p95LatencyMs}`,
      ...Object.entries(s.http.latencyByRouteClass).map(([routeClass, latency]) => `http_request_p95_latency_ms{route_class="${routeClass}"} ${latency.p95LatencyMs}`),
      `# HELP ai_requests_total Total AI inferences attempted`,
      `# TYPE ai_requests_total counter`,
      `ai_requests_total ${s.ai.totalRequests}`,
      `ai_requests_failed_total ${s.ai.failures}`,
      `ai_avg_latency_ms ${s.ai.avgLatencyMs}`,
      `ai_request_p50_latency_ms ${s.ai.p50LatencyMs}`,
      `ai_request_p95_latency_ms ${s.ai.p95LatencyMs}`,
      ...[...this.recentAiStageLatencies.entries()].map(([stage, samples]) => `ai_stage_p95_latency_ms{stage="${stage}"} ${percentile(samples, 0.95)}`),
      `# HELP db_queries_total Total database queries executed`,
      `# TYPE db_queries_total counter`,
      `db_queries_total ${s.database.totalQueries}`,
      `db_avg_latency_ms ${s.database.avgLatencyMs}`,
      `db_query_p50_latency_ms ${s.database.p50LatencyMs}`,
      `db_query_p95_latency_ms ${s.database.p95LatencyMs}`,
      `# HELP booking_attempts_total Total appointment booking attempts`,
      `# TYPE booking_attempts_total counter`,
      `booking_attempts_total ${s.appointments.totalAttempts}`,
      `booking_conflicts_total ${s.appointments.conflicts}`,
      `# HELP sos_dispatches_total Emergency SOS trigger counters`,
      `# TYPE sos_dispatches_total counter`,
      `sos_dispatches_mock_total ${s.emergencySos.mockDispatches}`,
      `sos_dispatches_real_total ${s.emergencySos.realDispatches}`,
      '# HELP ruangtenang_auth_sessions_total Sessions issued by authentication channel.',
      '# TYPE ruangtenang_auth_sessions_total counter',
      `ruangtenang_auth_sessions_total{channel="browser_cookie"} ${s.auth.browserCookieSessions}`,
      `ruangtenang_auth_sessions_total{channel="legacy_bearer"} ${s.auth.legacyBearerSessions}`,
      `ruangtenang_auth_sessions_total{channel="mobile"} ${s.auth.mobileSessions}`,
      `ruangtenang_mobile_refresh_success_total ${s.auth.mobileRefreshSuccesses}`,
      `ruangtenang_mobile_refresh_failure_total ${s.auth.mobileRefreshFailures}`,
      `ruangtenang_mobile_refresh_replay_total ${s.auth.mobileRefreshReplays}`,
      `ruangtenang_mobile_logout_total ${s.auth.mobileLogouts}`,
      ...Object.entries(s.auth.mobileClientVersions).map(([version, counters]) => `ruangtenang_mobile_client_sessions_total{version="${version}"} ${counters.sessions}`),
      ...Object.entries(s.auth.mobileClientVersions).map(([version, counters]) => `ruangtenang_mobile_client_refresh_success_total{version="${version}"} ${counters.refreshSuccesses}`),
      ...Object.entries(s.auth.mobileClientVersions).map(([version, counters]) => `ruangtenang_mobile_client_refresh_failure_total{version="${version}"} ${counters.refreshFailures}`),
      `ruangtenang_csrf_rejections_total ${s.security.csrfRejections}`,
      `ruangtenang_csp_violation_reports_total ${s.security.cspViolationReports}`,
      `ruangtenang_rate_limit_exceeded_total ${s.security.rateLimitExceeded}`
    ];

    const metricNames = new Set<ClientPerformanceMetricName>();
    for (const histogram of this.clientPerformanceHistograms.values()) {
      const metricName = clientMetricPrometheusName(histogram.name);
      if (!metricNames.has(histogram.name)) {
        lines.push(`# HELP ${metricName} ${histogram.name === 'CLS' ? 'Client Cumulative Layout Shift.' : `Client ${histogram.name} duration in milliseconds.`}`);
        lines.push(`# TYPE ${metricName} histogram`);
        metricNames.add(histogram.name);
      }
      const bounds = histogram.name === 'CLS' ? CLS_BUCKETS : TIME_BUCKETS_MS;
      const labels = `route="${histogram.route}",device="${histogram.device}",navigation_type="${histogram.navigationType}"`;
      bounds.forEach((bound, index) => lines.push(`${metricName}_bucket{${labels},le="${bound}"} ${histogram.buckets[index]}`));
      lines.push(`${metricName}_bucket{${labels},le="+Inf"} ${histogram.count}`);
      lines.push(`${metricName}_sum{${labels}} ${histogram.sum}`);
      lines.push(`${metricName}_count{${labels}} ${histogram.count}`);
    }

    return lines.join('\n');
  }

  reset() {
    this.totalRequests = 0;
    this.status2xx = 0;
    this.status4xx = 0;
    this.status5xx = 0;
    this.totalHttpLatencyMs = 0;
    this.recentHttpLatencyMs = [];
    this.recentHttpLatencyByClass.clear();
    this.aiRequests = 0;
    this.aiFailures = 0;
    this.totalAiLatencyMs = 0;
    this.recentAiLatencyMs = [];
    this.recentAiStageLatencies.clear();
    this.dbQueries = 0;
    this.dbErrors = 0;
    this.totalDbLatencyMs = 0;
    this.recentDbLatencyMs = [];
    this.clientPerformanceHistograms.clear();
    this.bookingAttempts = 0;
    this.bookingConflicts = 0;
    this.sosMockCount = 0;
    this.sosRealCount = 0;
    this.browserCookieSessions = 0;
    this.legacyBearerSessions = 0;
    this.mobileSessions = 0;
    this.mobileRefreshSuccesses = 0;
    this.mobileRefreshFailures = 0;
    this.mobileRefreshReplays = 0;
    this.mobileLogouts = 0;
    this.mobileClientVersions = {};
    this.csrfRejections = 0;
    this.cspViolationReports = 0;
    this.rateLimitExceeded = 0;
  }
}

export const metricsService = new MetricsService();
