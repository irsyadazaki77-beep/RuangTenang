import type { NextFunction, Request, Response } from 'express';

/**
 * The offline-owner header is only a consistency assertion. Authorization always comes from
 * the authenticated server session; the client supplied value never grants access.
 */
export function verifyOfflineOwner(req: Request, res: Response, next: NextFunction): void {
  const declaredOwner = req.get('X-RuangTenang-Offline-Owner');
  if (!declaredOwner) return next();
  if (!req.user || declaredOwner !== req.user.userId) {
    res.status(403).json({ success: false, code: 'OFFLINE_OWNER_MISMATCH', error: 'OFFLINE_OWNER_MISMATCH' });
    return;
  }
  next();
}
