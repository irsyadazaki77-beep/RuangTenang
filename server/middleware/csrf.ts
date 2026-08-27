/**
 * CSRF & Origin Verification Middleware
 * Protects state-changing mutations (POST, PUT, PATCH, DELETE) against Cross-Site Request Forgery.
 */

import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe read-only methods bypass CSRF checks
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // Exempt public webhook or server-to-server endpoints if any
  if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/webhooks')) {
    return next();
  }

  // If request includes custom headers (X-Requested-With, X-CSRF-Token) or Bearer token, it is safe from standard browser cross-site form submissions
  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'] || req.headers['x-client-platform'];
  const hasBearerAuth = req.headers.authorization?.startsWith('Bearer ');
  if (customHeader || hasBearerAuth) {
    return next();
  }

  // Check if session cookie is present (ambient credential)
  const hasCookieAuth = Boolean(req.cookies?.ruangtenang_session || req.cookies?.token);
  if (!hasCookieAuth) {
    // If no ambient cookie is used, request cannot exploit ambient cookie credentials
    return next();
  }

  // Verify Origin or Referer header
  const origin = req.headers['origin'] as string;
  const referer = req.headers['referer'] as string;
  const host = req.headers['host'] as string;

  if (!origin && !referer) {
    // In production, reject state-changing cookie mutations with missing origin/referer
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        code: 'CSRF_ORIGIN_MISSING',
        error: 'Akses ditolak: Header Origin atau Referer wajib disertakan untuk mutasi data sensitif.'
      });
    }
    return next();
  }

  // Validate origin against host or trusted origins
  const sourceUrl = origin || referer;
  try {
    const parsedSource = new URL(sourceUrl);
    const sourceHost = parsedSource.host;
    const sourceOrigin = parsedSource.origin;

    // Resolve configured allowed origins
    const allowedOrigins = new Set<string>();
    if (process.env.APP_ORIGIN) {
      allowedOrigins.add(process.env.APP_ORIGIN.trim());
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS.split(',').forEach(o => {
        if (o.trim()) allowedOrigins.add(o.trim());
      });
    }

    // Check if source matches current server host, localhost, or explicit allowlist
    const isSameHost = host && (sourceHost === host || sourceHost.split(':')[0] === host.split(':')[0]);
    const isLocalhost = sourceHost.startsWith('localhost') || sourceHost.startsWith('127.0.0.1') || sourceHost.startsWith('0.0.0.0');
    const isAIStudioPreview = sourceOrigin.endsWith('.run.app') || sourceOrigin.endsWith('.studio') || sourceOrigin === 'https://ai.studio' || sourceOrigin.endsWith('.google.com') || sourceOrigin.endsWith('.google.dev');
    const isExplicitlyAllowed = allowedOrigins.has(sourceOrigin) || isAIStudioPreview;

    if (isSameHost || isLocalhost || isExplicitlyAllowed) {
      return next();
    }

    // Origin mismatch
    console.warn(`[CSRF WARNING] Blocked mutation request from untrusted origin: ${sourceUrl} (Host: ${host})`);
    return res.status(403).json({
      success: false,
      code: 'CSRF_FORBIDDEN',
      error: 'Akses ditolak: Permintaan mutasi dari origin tidak dikenal diblokir demi keamanan privasi akun.'
    });
  } catch {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID_ORIGIN',
      error: 'Akses ditolak: Format origin tidak valid.'
    });
  }
}
