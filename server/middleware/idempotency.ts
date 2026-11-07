import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../database.js';

// ==========================================
// IDEMPOTENCY KEY STORE & MIDDLEWARE
// ==========================================
export const idempotencyStore = {
  clear: async () => {
    try {
      await prisma.idempotencyRecord.deleteMany({});
    } catch (e) {
      console.error('Failed to clear idempotency table:', e);
    }
  }
};

export async function clearIdempotencyStoreForTesting() {
  await idempotencyStore.clear();
}

// Clean up expired keys every hour
const cleanupTimer = setInterval(async () => {
  try {
    await prisma.idempotencyRecord.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  } catch (err) {
    console.error('Failed to clean up expired idempotency keys:', err);
  }
}, 60 * 60 * 1000);
cleanupTimer.unref();

export interface IdempotencyMiddlewareOptions {
  projectResponse?: (body: unknown) => unknown;
}

export function idempotencyMiddleware(options: IdempotencyMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to mutation methods
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (!isMutation) {
      return next();
    }

    const rawKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      req.body?.idempotencyKey;

    if (!rawKey || typeof rawKey !== 'string' || rawKey.trim() === '') {
      if (req.get('X-RuangTenang-Offline-Owner')) {
        return res.status(400).json({ success: false, code: 'IDEMPOTENCY_KEY_REQUIRED', error: 'IDEMPOTENCY_KEY_REQUIRED' });
      }
      return next();
    }

    const normalizedKey = rawKey.trim();
    if (normalizedKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(normalizedKey)) {
      return res.status(400).json({ success: false, code: 'IDEMPOTENCY_KEY_INVALID', error: 'IDEMPOTENCY_KEY_INVALID' });
    }

    req.idempotencyKey = normalizedKey;

    // Derive isolated subject namespace from authenticated user, session, or IP
    const subject = req.user?.userId || req.user?.sessionId || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
    const method = req.method.toUpperCase();
    const route = (req.baseUrl || '') + (req.path || (req.originalUrl || req.url).split('?')[0]);
    
    // Composite namespaced storage key
    const compositeKey = `${subject}:${method}:${route}:${normalizedKey}`;

    // Request body fingerprinting using SHA-256
    const bodyString = JSON.stringify(req.body || {});
    const currentBodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const sendCached = (cached: { responseStatus: number; responseBody: string }) => {
      if (cached.responseStatus === 0) {
        return res.status(409).json({
          success: false,
          code: 'IDEMPOTENCY_IN_PROGRESS',
          error: 'IDEMPOTENCY_IN_PROGRESS',
          message: 'Permintaan dengan kunci yang sama sedang diproses.',
        });
      }
      try {
        const parsedBody = JSON.parse(cached.responseBody) as Record<string, unknown>;
        return res.status(cached.responseStatus).json({ ...parsedBody, isIdempotentReplay: true, requestId: req.requestId });
      } catch {
        return res.status(503).json({ success: false, code: 'IDEMPOTENCY_RESPONSE_UNAVAILABLE', error: 'IDEMPOTENCY_RESPONSE_UNAVAILABLE' });
      }
    };

    try {
      let reservation = await prisma.idempotencyRecord.findUnique({ where: { key: compositeKey } });
      if (reservation && reservation.requestHash !== currentBodyHash) {
        return res.status(409).json({ success: false, code: 'IDEMPOTENCY_CONFLICT', error: 'IDEMPOTENCY_CONFLICT' });
      }
      if (reservation) return sendCached(reservation);

      try {
        reservation = await prisma.idempotencyRecord.create({
          data: {
            key: compositeKey,
            userId: req.user?.userId || null,
            route,
            method,
            requestHash: currentBodyHash,
            responseStatus: 0,
            responseBody: '',
            expiresAt,
          },
        });
      } catch {
        const racedReservation = await prisma.idempotencyRecord.findUnique({ where: { key: compositeKey } });
        if (!racedReservation) throw new Error('IDEMPOTENCY_RESERVATION_FAILED');
        if (racedReservation.requestHash !== currentBodyHash) {
          return res.status(409).json({ success: false, code: 'IDEMPOTENCY_CONFLICT', error: 'IDEMPOTENCY_CONFLICT' });
        }
        return sendCached(racedReservation);
      }

      const originalJson = res.json.bind(res);
      let finalized = false;
      res.json = (body: any) => {
        if (finalized) return originalJson(body);
        finalized = true;
        const status = res.statusCode;
        const responseForCache = options.projectResponse ? options.projectResponse(body) : body;
        const persist = status >= 200 && status < 300
          ? prisma.idempotencyRecord.update({
              where: { key: compositeKey },
              data: { responseStatus: status, responseBody: JSON.stringify(responseForCache), expiresAt },
            })
          : prisma.idempotencyRecord.deleteMany({ where: { key: compositeKey } });
        void persist.then(() => {
          if (!res.writableEnded) originalJson(body);
        }).catch(() => {
          // Keep the in-progress reservation on persistence failure to prevent a duplicate write.
          if (!res.writableEnded) originalJson(body);
        });
        return res;
      };

      next();
    } catch {
      return res.status(503).json({ success: false, code: 'IDEMPOTENCY_STORE_UNAVAILABLE', error: 'IDEMPOTENCY_STORE_UNAVAILABLE' });
    }
  };
}
