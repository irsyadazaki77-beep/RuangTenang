/** CSRF and exact-origin checks for cookie-authenticated mutations. */
import { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';
import { isLocalDevelopmentOrTest, isProductionLikeEnvironment } from '../config/environment.js';
import { metricsService } from '../services/metricsService.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const csrfRouter = Router();

csrfRouter.get('/csrf-token', (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: isProductionLikeEnvironment(),
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, csrfToken: token });
});

function configuredOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of [process.env.APP_ORIGIN, process.env.CORS_ALLOWED_ORIGINS]) {
    value?.split(',').forEach(origin => {
      const normalized = origin.trim().toLowerCase();
      if (normalized) origins.add(normalized);
    });
  }
  if (isLocalDevelopmentOrTest()) {
    for (const port of [3000, 5173]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }
  return origins;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Native mobile endpoints enforce an originless, cookie-free client boundary at the router.
  if (/^\/api(?:\/v1)?\/auth\/mobile(?:\/|$)/.test(req.path) || req.path === '/api/v1/security/csp-report') return next();
  const hardened = isProductionLikeEnvironment();
  if (SAFE_METHODS.has(req.method.toUpperCase())) return next();
  if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/webhooks')) return next();

  const hasCookieAuth = Boolean(req.cookies?.ruangtenang_session || req.cookies?.rt_auth_token || req.cookies?.rt_guest_attachment || req.cookies?.token);
  const hasBearerAuth = Boolean(req.headers.authorization?.startsWith('Bearer '));
  const hasCustomClientHeader = Boolean(req.headers['x-requested-with']);
  if (!hardened && hasCustomClientHeader && !req.headers.origin && !req.headers.referer) return next();
  if (!hasCookieAuth && hasBearerAuth) return next();

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  const source = (Array.isArray(originHeader) ? originHeader[0] : originHeader) ||
    (Array.isArray(refererHeader) ? refererHeader[0] : refererHeader);
  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.['XSRF-TOKEN'];

  if (!source && hardened && (hasCookieAuth || !hasBearerAuth)) {
    metricsService.recordSecurityEvent('csrf_rejection');
    return res.status(403).json({ success: false, code: 'CSRF_ORIGIN_MISSING', error: 'Header Origin atau Referer wajib disertakan.' });
  }
  if (hasCookieAuth && (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader)) {
    metricsService.recordSecurityEvent('csrf_rejection');
    return res.status(403).json({ success: false, code: 'CSRF_FORBIDDEN', error: 'Token CSRF tidak valid atau tidak cocok.' });
  }
  if (csrfCookie && csrfHeader && csrfCookie !== csrfHeader) {
    metricsService.recordSecurityEvent('csrf_rejection');
    return res.status(403).json({ success: false, code: 'CSRF_FORBIDDEN', error: 'Token CSRF tidak cocok.' });
  }
  if (!source) return next();

  try {
    const parsed = new URL(source);
    const sourceOrigin = parsed.origin.toLowerCase();
    const expectedOrigin = `${req.protocol.toLowerCase()}://${(req.headers.host || '').toLowerCase()}`;
    if (sourceOrigin === expectedOrigin || configuredOrigins().has(sourceOrigin)) return next();
    console.warn(`[CSRF WARNING] Blocked mutation from untrusted origin: ${sourceOrigin}`);
    metricsService.recordSecurityEvent('csrf_rejection');
    return res.status(403).json({ success: false, code: 'CSRF_FORBIDDEN', error: 'Permintaan mutasi dari origin tidak dikenal diblokir.' });
  } catch {
    metricsService.recordSecurityEvent('csrf_rejection');
    return res.status(403).json({ success: false, code: 'CSRF_INVALID_ORIGIN', error: 'Format origin tidak valid.' });
  }
}
