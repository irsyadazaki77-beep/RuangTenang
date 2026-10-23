import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { PERFORMANCE_TELEMETRY_CONSENT_EVENT } from './performanceTelemetryConsent';

type MetricName = 'LCP' | 'INP' | 'CLS' | 'AI_TTFT' | 'AI_TOTAL';
type RouteClass = 'chat' | 'workspace' | 'mood' | 'screening' | 'counselors' | 'other';
type NavigationClass = 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'soft-navigation' | 'other';

interface PerformanceSample {
  name: MetricName;
  value: number;
  route: RouteClass;
  device: 'mobile' | 'desktop';
  navigationType: NavigationClass;
}

const AI_STREAM_METRIC_EVENT = 'rt-ai-stream-performance';
const samples: PerformanceSample[] = [];
let started = false;
let consentEnabled = false;

function classifyRoute(pathname: string): RouteClass {
  if (pathname === '/' || /^\/c\/[^/]+/.test(pathname)) return 'chat';
  if (pathname.startsWith('/workspace')) return 'workspace';
  if (pathname.startsWith('/mood') || pathname.startsWith('/mindfulness')) return 'mood';
  if (pathname.startsWith('/screening')) return 'screening';
  if (pathname.startsWith('/counselors') || pathname.startsWith('/counselor')) return 'counselors';
  return 'other';
}

function navigationClass(value?: string): NavigationClass {
  switch (value) {
    case 'navigate':
    case 'reload':
    case 'back-forward':
    case 'back-forward-cache':
    case 'soft-navigation':
      return value;
    default:
      return 'other';
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function addSample(name: MetricName, value: number, navigationType: string = 'other') {
  if (!consentEnabled || !Number.isFinite(value) || value < 0 || samples.length >= 20) return;
  samples.push({
    name,
    value,
    route: classifyRoute(window.location.pathname),
    device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
    navigationType: navigationClass(navigationType)
  });
}

function addWebVital(metric: Metric) {
  if (metric.name !== 'LCP' && metric.name !== 'INP' && metric.name !== 'CLS') return;
  addSample(metric.name, metric.value, metric.navigationType);
}

function flushSamples(force = false) {
  if (!consentEnabled || samples.length === 0 || (!force && document.visibilityState !== 'hidden')) return;
  const payload = JSON.stringify({ samples: samples.splice(0, 20) });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  const csrfToken = getCookie('XSRF-TOKEN');
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  void fetch('/api/v1/telemetry/performance', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    keepalive: true,
    referrerPolicy: 'origin',
    headers,
    body: payload
  }).catch(() => undefined);
}

export function startPerformanceTelemetry() {
  if (started || typeof window === 'undefined' || typeof document === 'undefined') return;
  started = true;
  consentEnabled = true;

  const options = { reportSoftNavs: true };
  onCLS(addWebVital, options);
  onINP(addWebVital, options);
  onLCP(addWebVital, options);

  window.addEventListener(AI_STREAM_METRIC_EVENT, (event: Event) => {
    const detail = (event as CustomEvent<{ name?: unknown; value?: unknown }>).detail;
    if ((detail?.name === 'AI_TTFT' || detail?.name === 'AI_TOTAL') && typeof detail.value === 'number') {
      addSample(detail.name, detail.value, 'other');
    }
  });
  window.addEventListener(PERFORMANCE_TELEMETRY_CONSENT_EVENT, (event: Event) => {
    setPerformanceTelemetryConsent((event as CustomEvent<boolean>).detail === true);
  });
  document.addEventListener('visibilitychange', () => flushSamples());
  window.addEventListener('pagehide', () => flushSamples(true));
}

export function setPerformanceTelemetryConsent(consented: boolean) {
  if (consented) {
    startPerformanceTelemetry();
    consentEnabled = true;
    return;
  }
  consentEnabled = false;
  samples.length = 0;
}
