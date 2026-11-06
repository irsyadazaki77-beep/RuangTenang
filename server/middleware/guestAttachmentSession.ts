import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { isProductionLikeEnvironment } from '../config/environment.js';

export const GUEST_ATTACHMENT_COOKIE = 'rt_guest_attachment';
export const GUEST_ATTACHMENT_HEADER = 'x-guest-attachment-token';
export const GUEST_ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000;

function ownerFromToken(token: string): string {
  return `guest:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

function cookieOptions(req?: Request) {
  const isHttps = isProductionLikeEnvironment() || Boolean(req?.secure) || req?.get('x-forwarded-proto') === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: GUEST_ATTACHMENT_TTL_MS
  };
}

function extractValidGuestToken(req: Request): { token: string; fromCookie: boolean } | null {
  const cookieToken = req.cookies?.[GUEST_ATTACHMENT_COOKIE];
  if (typeof cookieToken === 'string' && /^[a-f0-9]{64}$/i.test(cookieToken.trim())) {
    return { token: cookieToken.trim().toLowerCase(), fromCookie: true };
  }
  const headerToken = req.get('X-Guest-Attachment-Token') || req.headers[GUEST_ATTACHMENT_HEADER];
  const rawHeader = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  if (typeof rawHeader === 'string' && /^[a-f0-9]{64}$/i.test(rawHeader.trim())) {
    return { token: rawHeader.trim().toLowerCase(), fromCookie: false };
  }
  return null;
}

export function guestAttachmentSession(options: { issueIfMissing?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.userId) {
      req.attachmentOwnerId = req.user.userId;
      return next();
    }

    const extracted = extractValidGuestToken(req);
    if (extracted) {
      if (!extracted.fromCookie) {
        res.cookie(GUEST_ATTACHMENT_COOKIE, extracted.token, cookieOptions(req));
      }
      res.setHeader('X-Guest-Attachment-Token', extracted.token);
      req.attachmentOwnerId = ownerFromToken(extracted.token);
      return next();
    }

    if (req.cookies?.[GUEST_ATTACHMENT_COOKIE]) {
      res.clearCookie(GUEST_ATTACHMENT_COOKIE, { ...cookieOptions(req), maxAge: undefined });
    }
    if (options.issueIfMissing) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(GUEST_ATTACHMENT_COOKIE, token, cookieOptions(req));
      res.setHeader('X-Guest-Attachment-Token', token);
      req.attachmentOwnerId = ownerFromToken(token);
      return next();
    }

    return res.status(401).json({ success: false, code: 'GUEST_SESSION_REQUIRED', message: 'Sesi lampiran tamu tidak tersedia atau telah kedaluwarsa.' });
  };
}

/** Bind authenticated or existing guest identity without requiring guests to have a cookie. */
export function optionalAttachmentOwner(req: Request, res: Response, next: NextFunction) {
  if (req.user?.userId) {
    req.attachmentOwnerId = req.user.userId;
  } else {
    const extracted = extractValidGuestToken(req);
    if (extracted) {
      if (!extracted.fromCookie) {
        res.cookie(GUEST_ATTACHMENT_COOKIE, extracted.token, cookieOptions(req));
      }
      res.setHeader('X-Guest-Attachment-Token', extracted.token);
      req.attachmentOwnerId = ownerFromToken(extracted.token);
    }
  }
  next();
}

