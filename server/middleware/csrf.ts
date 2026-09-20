/**
 * CSRF & Origin Verification Middleware
 * Protects state-changing mutations (POST, PUT, PATCH, DELETE) against Cross-Site Request Forgery.
 */

import { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoint GET /api/csrf-token to generate a random 32-byte hex token
export const csrfRouter = Router();
csrfRouter.get('/csrf-token', (req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // readable by client-side JS
    secure: isProd,  // only HTTPS in production
    sameSite: isProd ? 'none' : 'lax', // 'none' ensures compatibility in embedded preview iframes (AI Studio)
    path: '/'
  });

  res.json({
    success: true,
    csrfToken: token
  });
});

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Safe read-only methods bypass CSRF checks
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // 2. Exempt public webhook or server-to-server endpoints if any
  if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/webhooks')) {
    return next();
  }

  // Check ambient credentials (cookies) vs non-ambient credentials (Bearer without cookies)
  const hasCookieAuth = Boolean(req.cookies?.ruangtenang_session || req.cookies?.token);
  const hasBearerAuth = Boolean(req.headers.authorization?.startsWith('Bearer '));
  const hasCustomClientHeader = Boolean(req.headers['x-requested-with']);

  // If custom client header (e.g., X-Requested-With) is present without malicious origin, it cannot be forged cross-origin
  if (hasCustomClientHeader && !req.headers['origin'] && !req.headers['referer']) {
    return next();
  }

  // If NO ambient cookie is present and request uses pure Bearer auth, bypass CSRF
  if (!hasCookieAuth && hasBearerAuth) {
    return next();
  }

  const origin = req.headers['origin'] as string;
  const referer = req.headers['referer'] as string;
  const host = req.headers['host'] as string;
  const csrfHeaderToken = req.headers['x-csrf-token'] as string;
  const csrfCookieToken = req.cookies?.['XSRF-TOKEN'] as string;
  const sourceUrl = origin || referer;

  // 1. Origin missing check in production for requests with session cookies
  if (!sourceUrl && isProd && (hasCookieAuth || !hasBearerAuth) && !csrfHeaderToken) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_ORIGIN_MISSING',
      error: 'Akses ditolak: Header Origin atau Referer wajib disertakan untuk mutasi data sensitif.'
    });
  }

  // 2. CSRF Token Validation:
  // When session cookie authentication is present, CSRF token validation is strictly enforced
  if (hasCookieAuth) {
    if (!csrfCookieToken || !csrfHeaderToken || csrfCookieToken !== csrfHeaderToken) {
      return res.status(403).json({
        success: false,
        code: 'CSRF_FORBIDDEN',
        error: 'Akses ditolak: Token CSRF tidak valid atau tidak cocok.'
      });
    }
  } else if (csrfCookieToken && csrfHeaderToken && csrfCookieToken !== csrfHeaderToken) {
    // If both are provided on unauthenticated requests, ensure they don't conflict
    return res.status(403).json({
      success: false,
      code: 'CSRF_FORBIDDEN',
      error: 'Akses ditolak: Token CSRF tidak cocok.'
    });
  }

  if (!sourceUrl) {
    // In production, state-changing mutations with cookie auth require Origin/Referer header
    if (isProd && (hasCookieAuth || !hasBearerAuth)) {
      return res.status(403).json({
        success: false,
        code: 'CSRF_ORIGIN_MISSING',
        error: 'Akses ditolak: Header Origin atau Referer wajib disertakan untuk mutasi data sensitif.'
      });
    }
    return next();
  }

  // Validate origin/referer against host or configured allowlist
  try {
    const parsedSource = new URL(sourceUrl);
    const sourceHost = parsedSource.host.toLowerCase();
    const sourceOrigin = parsedSource.origin.toLowerCase();
    const sourceHostname = parsedSource.hostname.toLowerCase();

    // Resolve configured allowed origins
    const allowedOrigins = new Set<string>();
    if (process.env.APP_ORIGIN) {
      process.env.APP_ORIGIN.split(',').forEach(o => {
        if (o.trim()) allowedOrigins.add(o.trim().toLowerCase());
      });
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS.split(',').forEach(o => {
        if (o.trim()) allowedOrigins.add(o.trim().toLowerCase());
      });
    }
    if (!isProd) {
      allowedOrigins.add('https://ruangtenang.ai.studio');
      allowedOrigins.add('https://ruangtenang.ui.ac.id');
    }

    // Exact host match
    const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim().toLowerCase();
    const effectiveHost = (forwardedHost || host)?.toLowerCase();
    const isSameHost = effectiveHost && (sourceHost === effectiveHost || sourceHost.split(':')[0] === effectiveHost.split(':')[0]);
    const isExplicitlyAllowed = allowedOrigins.has(sourceOrigin);
    const isLocalhost = sourceHostname === 'localhost' || sourceHostname === '127.0.0.1' || sourceHostname === '0.0.0.0';
    const isPlatformDomain = sourceOrigin === 'https://ai.studio' ||
                             sourceOrigin === 'https://aistudio.google.com' ||
                             sourceHostname.endsWith('.ai.studio');
    const isDevPreview = (!isProd || process.env.IS_AI_STUDIO_PREVIEW === 'true' || process.env.PREVIEW_MODE === 'true') &&
                         (sourceHostname.endsWith('.run.app') || sourceHostname.endsWith('.studio') || sourceHostname.endsWith('.google.dev'));

    // Strictly enforce same host, explicit allowlist, or verified platform preview domains
    const isMatch = isSameHost || isExplicitlyAllowed || isPlatformDomain || isLocalhost || isDevPreview;

    if (isMatch) {
      return next();
    }

    // Origin mismatch
    console.warn(`[CSRF WARNING] Blocked mutation request from untrusted origin: ${sourceUrl} (Host: ${host})`);
    return res.status(403).json({
      success: false,
      code: 'CSRF_FORBIDDEN',
      error: 'Akses ditolak: Permintaan mutasi dari origin tidak dikenal diblokir demi keamanan privasi akun.'
    });
  } catch (err) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID_ORIGIN',
      error: 'Akses ditolak: Format origin tidak valid.'
    });
  }
}

