import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { isProductionLikeEnvironment } from '../config/environment.js';

export const GUEST_ATTACHMENT_COOKIE = 'rt_guest_attachment';
export const GUEST_ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000;

function ownerFromToken(token: string): string {
  return `guest:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionLikeEnvironment(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: GUEST_ATTACHMENT_TTL_MS
  };
}

export function guestAttachmentSession(options: { issueIfMissing?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.userId) {
      req.attachmentOwnerId = req.user.userId;
      return next();
    }

    const supplied = req.cookies?.[GUEST_ATTACHMENT_COOKIE];
    if (typeof supplied === 'string' && /^[a-f0-9]{64}$/.test(supplied)) {
      req.attachmentOwnerId = ownerFromToken(supplied);
      return next();
    }

    if (supplied) res.clearCookie(GUEST_ATTACHMENT_COOKIE, { ...cookieOptions(), maxAge: undefined });
    if (options.issueIfMissing) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(GUEST_ATTACHMENT_COOKIE, token, cookieOptions());
      req.attachmentOwnerId = ownerFromToken(token);
      return next();
    }

    return res.status(401).json({ success: false, code: 'GUEST_SESSION_REQUIRED', message: 'Sesi lampiran tamu tidak tersedia atau telah kedaluwarsa.' });
  };
}

/** Bind authenticated or existing guest identity without requiring guests to have a cookie. */
export function optionalAttachmentOwner(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.userId) req.attachmentOwnerId = req.user.userId;
  else {
    const token = req.cookies?.[GUEST_ATTACHMENT_COOKIE];
    if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) req.attachmentOwnerId = ownerFromToken(token);
  }
  next();
}
