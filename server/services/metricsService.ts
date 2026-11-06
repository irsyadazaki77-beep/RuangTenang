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
  };
  ai: {
    totalRequests: number;
    failures: number;
    failureRatePercentage: number;
    avgLatencyMs: number;
  };
  database: {
    totalQueries: number;
    errors: number;
    avgLatencyMs: number;
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

class MetricsService {
  private startTime = Date.now();

  // HTTP metrics
  private totalRequests = 0;
  private status2xx = 0;
  private status4xx = 0;
  private status5xx = 0;
  private totalHttpLatencyMs = 0;

  // AI metrics
  private aiRequests = 0;
  private aiFailures = 0;
  private totalAiLatencyMs = 0;

  // Database metrics
  private dbQueries = 0;
  private dbErrors = 0;
  private totalDbLatencyMs = 0;

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

  recordHttpRequest(statusCode: number, latencyMs: number) {
    this.totalRequests++;
    this.totalHttpLatencyMs += Math.max(0, latencyMs);
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
    this.totalAiLatencyMs += Math.max(0, latencyMs);
    if (!success) {
      this.aiFailures++;
    }
  }

  recordDbQuery(success: boolean, latencyMs: number) {
    this.dbQueries++;
    this.totalDbLatencyMs += Math.max(0, latencyMs);
    if (!success) {
      this.dbErrors++;
    }
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

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      http: {
        totalRequests: this.totalRequests,
        status2xx: this.status2xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        rate5xxPercentage,
        avgLatencyMs
      },
      ai: {
        totalRequests: this.aiRequests,
        failures: this.aiFailures,
        failureRatePercentage: aiFailureRatePercentage,
        avgLatencyMs: avgAiLatencyMs
      },
      database: {
        totalQueries: this.dbQueries,
        errors: this.dbErrors,
        avgLatencyMs: avgDbLatencyMs
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
    return [
      `# HELP http_requests_total Total number of HTTP requests processed`,
      `# TYPE http_requests_total counter`,
      `http_requests_total ${s.http.totalRequests}`,
      `http_requests_5xx_total ${s.http.status5xx}`,
      `http_request_avg_latency_ms ${s.http.avgLatencyMs}`,
      `# HELP ai_requests_total Total AI inferences attempted`,
      `# TYPE ai_requests_total counter`,
      `ai_requests_total ${s.ai.totalRequests}`,
      `ai_requests_failed_total ${s.ai.failures}`,
      `ai_avg_latency_ms ${s.ai.avgLatencyMs}`,
      `# HELP db_queries_total Total database queries executed`,
      `# TYPE db_queries_total counter`,
      `db_queries_total ${s.database.totalQueries}`,
      `db_avg_latency_ms ${s.database.avgLatencyMs}`,
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
    ].join('\n');
  }

  reset() {
    this.totalRequests = 0;
    this.status2xx = 0;
    this.status4xx = 0;
    this.status5xx = 0;
    this.totalHttpLatencyMs = 0;
    this.aiRequests = 0;
    this.aiFailures = 0;
    this.totalAiLatencyMs = 0;
    this.dbQueries = 0;
    this.dbErrors = 0;
    this.totalDbLatencyMs = 0;
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
