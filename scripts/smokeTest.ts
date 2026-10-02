/**
 * Production Smoke Test Script
 * RuangTenang - Fase 15 Release Hardening
 *
 * Validates:
 * 1. Health endpoint (liveness -> 200)
 * 2. Readiness endpoint (readiness -> 200 when ready)
 * 3. Static asset / HTML serving
 * 4. API base & version metadata response
 * 5. Unauthorized protected endpoint rejection (401)
 * 6. Direct sensitive static exposure rejection (.env, etc.)
 */

const BASE_URL = process.env.SMOKE_TARGET_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

interface TestResult {
  step: string;
  url: string;
  passed: boolean;
  status?: number;
  details?: string;
}

async function runSmokeTests(): Promise<void> {
  console.log(`\n======================================================`);
  console.log(`[PRODUCTION SMOKE TEST] Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const results: TestResult[] = [];

  // Helper fetch with timeout
  const timedFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  // 1. Healthcheck (Liveness)
  try {
    const res = await timedFetch('/api/v1/health');
    const body = await res.json().catch(() => ({}));
    const passed = res.status === 200 && (body.status === 'ok' || body.success === true);
    results.push({
      step: '1. Process Liveness Check (/api/v1/health)',
      url: '/api/v1/health',
      passed,
      status: res.status,
      details: JSON.stringify(body),
    });
  } catch (err: any) {
    results.push({
      step: '1. Process Liveness Check (/api/v1/health)',
      url: '/api/v1/health',
      passed: false,
      details: err.message,
    });
  }

  // 2. Readiness Check (/api/v1/readiness)
  try {
    const res = await timedFetch('/api/v1/readiness');
    const body = await res.json().catch(() => ({}));
    const passed = res.status === 200 && body.status === 'ready' && body.database === 'connected';
    results.push({
      step: '2. Dependency Readiness Check (/api/v1/readiness)',
      url: '/api/v1/readiness',
      passed,
      status: res.status,
      details: JSON.stringify(body),
    });
  } catch (err: any) {
    results.push({
      step: '2. Dependency Readiness Check (/api/v1/readiness)',
      url: '/api/v1/readiness',
      passed: false,
      details: err.message,
    });
  }

  // 3. Static Web App / Single Page App Root
  try {
    const res = await timedFetch('/');
    const html = await res.text();
    const passed = res.status === 200 && (html.includes('<!DOCTYPE html>') || html.includes('<html'));
    results.push({
      step: '3. Web App Static Root HTML (/)',
      url: '/',
      passed,
      status: res.status,
      details: `Received ${html.length} bytes HTML`,
    });
  } catch (err: any) {
    results.push({
      step: '3. Web App Static Root HTML (/)',
      url: '/',
      passed: false,
      details: err.message,
    });
  }

  // 4. Public Web App Manifest
  try {
    const res = await timedFetch('/manifest.json');
    const body = await res.json().catch(() => ({}));
    const passed = res.status === 200 && body.short_name === 'RuangTenang';
    results.push({
      step: '4. Public Web App Manifest (/manifest.json)',
      url: '/manifest.json',
      passed,
      status: res.status,
      details: JSON.stringify(body),
    });
  } catch (err: any) {
    results.push({
      step: '4. Public Web App Manifest (/manifest.json)',
      url: '/manifest.json',
      passed: false,
      details: err.message,
    });
  }

  // 5. Unauthorized Protected Endpoint Rejection
  try {
    const res = await timedFetch('/api/v1/appointments', {
      method: 'GET',
    });
    // Must return 401 Unauthorized
    const passed = res.status === 401;
    results.push({
      step: '5. Protected Endpoint Access Control (/api/v1/appointments)',
      url: '/api/v1/appointments',
      passed,
      status: res.status,
      details: `Expected 401, got ${res.status}`,
    });
  } catch (err: any) {
    results.push({
      step: '5. Protected Endpoint Access Control (/api/v1/appointments)',
      url: '/api/v1/appointments',
      passed: false,
      details: err.message,
    });
  }

  // 6. Direct Sensitive File Exposure Rejection
  try {
    const res = await timedFetch('/.env');
    // Must NOT return 200 OK with sensitive contents
    const bodyText = await res.text();
    const isHtmlFallback = res.headers.get('content-type')?.includes('text/html') && /<html\b/i.test(bodyText);
    const passed = res.status === 404 || res.status === 403 || (res.status === 200 && Boolean(isHtmlFallback));
    results.push({
      step: '6. Sensitive File Exposure Block (/.env)',
      url: '/.env',
      passed,
      status: res.status,
      details: `Status ${res.status}, body length: ${bodyText.length}`,
    });
  } catch (err: any) {
    results.push({
      step: '6. Sensitive File Exposure Block (/.env)',
      url: '/.env',
      passed: false,
      details: err.message,
    });
  }

  // Summary
  console.log(`SMOKE TEST RESULTS:`);
  let hasFailure = false;
  for (const r of results) {
    const badge = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${badge}] ${r.step} (Status: ${r.status ?? 'ERR'}) -> ${r.details || ''}`);
    if (!r.passed) {
      hasFailure = true;
    }
  }

  console.log(`\n======================================================`);
  if (hasFailure) {
    console.error(`[SMOKE TEST FAILED] One or more release checks did not succeed.`);
    process.exit(1);
  } else {
    console.log(`[SMOKE TEST PASSED] All 6 release criteria succeeded cleanly.`);
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error('[UNEXPECTED_SMOKE_ERROR]', err);
  process.exit(1);
});
