import { Request, Response, NextFunction } from 'express';

// ==========================================
// TIMEOUT & ABORT REQUEST MIDDLEWARE
// ==========================================
export function timeoutMiddleware(timeoutMs: number = 15000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Exclude streaming endpoints entirely
    if (req.originalUrl?.includes('/stream') || req.url?.includes('/stream')) {
      return next();
    }

    // Extended timeout for complex AI generation & comparison non-streaming routes
    const isAiProcessingRoute = req.originalUrl?.includes('/chat') ||
                                req.originalUrl?.includes('/workspace/comparison') ||
                                req.url?.includes('/chat') ||
                                req.url?.includes('/workspace/comparison');

    const effectiveTimeoutMs = isAiProcessingRoute ? Math.max(timeoutMs, 120_000) : timeoutMs;

    // Attach request-level abort controller for downstream cancellation
    const reqAbortController = new AbortController();
    (req as any).abortSignal = reqAbortController.signal;

    const timer = setTimeout(() => {
      reqAbortController.abort();
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'REQUEST_TIMEOUT',
          message: `Permintaan melebihi batas waktu (${Math.round(effectiveTimeoutMs / 1000)} detik). Silakan coba beberapa saat lagi.`,
          requestId: req.requestId
        });
      }
    }, effectiveTimeoutMs);

    // Clear timeout on response finish
    res.on('finish', () => {
      clearTimeout(timer);
    });

    // IncomingMessage close also fires when a normal request body finishes.
    // Response close identifies an actual disconnect while generation is pending.
    res.on('close', () => {
      clearTimeout(timer);
      if (!res.writableEnded) {
        reqAbortController.abort();
      }
    });
    req.on('aborted', () => { clearTimeout(timer); reqAbortController.abort(); });

    next();
  };
}
