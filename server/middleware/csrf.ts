/**
 * CSRF & Origin Verification Middleware
 * Protects state-changing mutations (POST, PUT, PATCH, DELETE) against Cross-Site Request Forgery.
 */

import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

  // If NO ambient cookie is present and request uses pure Bearer auth, bypass CSRF
  if (!hasCookieAuth && hasBearerAuth) {
    return next();
  }

  // If NO auth cookie and NO bearer auth (e.g., public POST like /api/v1/auth/login or /api/v1/auth/register),
  // origin validation is still enforced in production to prevent cross-site form submissions against login/register endpoints!

  const origin = req.headers['origin'] as string;
  const referer = req.headers['referer'] as string;
  const host = req.headers['host'] as string;
  const csrfHeaderToken = req.headers['x-csrf-token'] as string;

  const sourceUrl = origin || referer;

  if (!sourceUrl) {
    // In production, state-changing mutations (especially with cookie auth) require Origin/Referer header or valid CSRF token
    if (isProd && (hasCookieAuth || !hasBearerAuth)) {
      if (!csrfHeaderToken) {
        return res.status(403).json({
          success: false,
          code: 'CSRF_ORIGIN_MISSING',
          error: 'Akses ditolak: Header Origin atau Referer wajib disertakan untuk mutasi data sensitif.'
        });
      }
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
      allowedOrigins.add(process.env.APP_ORIGIN.trim().toLowerCase());
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS.split(',').forEach(o => {
        if (o.trim()) allowedOrigins.add(o.trim().toLowerCase());
      });
    }
    allowedOrigins.add('https://ruangtenang.ai.studio');
    allowedOrigins.add('https://ruangtenang.ui.ac.id');

    // Exact host match
    const isSameHost = host && (sourceHost === host.toLowerCase() || sourceHost.split(':')[0] === host.toLowerCase().split(':')[0]);
    const isExplicitlyAllowed = allowedOrigins.has(sourceOrigin);

    if (isProd) {
      // Production: Strictly NO wildcard preview matching! Only same host or exact APP_ORIGIN / CORS_ALLOWED_ORIGINS
      if (isSameHost || isExplicitlyAllowed) {
        return next();
      }
    } else {
      // Dev / Staging: Allow local development & preview domains
      const isLocalhost = sourceHostname === 'localhost' || sourceHostname === '127.0.0.1' || sourceHostname === '0.0.0.0';
      const isAIStudioPreview = sourceHostname.endsWith('.run.app') ||
                                sourceHostname.endsWith('.studio') ||
                                sourceOrigin === 'https://ai.studio' ||
                                sourceHostname.endsWith('.google.com') ||
                                sourceHostname.endsWith('.google.dev');

      if (isSameHost || isLocalhost || isAIStudioPreview || isExplicitlyAllowed) {
        return next();
      }
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
