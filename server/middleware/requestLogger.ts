import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { metricsService } from '../services/metricsService.js';
import { sanitizeUrlForLogs, pseudonymizeIp } from '../utils/urlSanitizer.js';

export function classifyHttpRequest(req: Request): string {
  const routePath = `${req.baseUrl || ''}${String((req as Request & { route?: { path?: unknown } }).route?.path || '')}`.toLowerCase();
  const path = routePath || (req.path || '').toLowerCase();
  if (path.includes('/chat/stream')) return 'ai_stream';
  if (path.includes('/chat') || path.includes('/ai/')) return 'ai_api';
  if (path.includes('/workspace')) return 'workspace_api';
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/appointment')) return 'appointments';
  if (path.includes('/privacy')) return 'privacy';
  if (path.includes('/health') || path.includes('/readiness') || path.includes('/readyz')) return 'health';
  if ((req.method || '').toUpperCase() === 'GET') return 'read_api';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((req.method || '').toUpperCase())) return 'write_api';
  return 'other';
}

export function requestIdAndLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const isApiRequest = req.url.startsWith('/api') || req.url.startsWith('/docs') || req.url.startsWith('/openapi');
  if (!isApiRequest) {
    return next();
  }

  const startTime = Date.now();
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const clientIpHash = pseudonymizeIp(rawIp as string);
  const cleanUrl = sanitizeUrlForLogs(req.originalUrl || req.url);

  // Log incoming request with sanitized URL and pseudonymized IP
  console.log(JSON.stringify({
    event: 'HTTP_REQUEST_IN',
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: cleanUrl,
    ipHash: clientIpHash,
  }));

  // Log outgoing response
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    metricsService.recordHttpRequest(res.statusCode, durationMs, classifyHttpRequest(req));
    console.log(JSON.stringify({
      event: 'HTTP_RESPONSE_OUT',
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: cleanUrl,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader('content-length') || 0
    }));
  });

  next();
}
