import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { isProductionLikeEnvironment } from '../config/environment.js';
import { formatP2002ErrorMessage } from '../utils/prismaErrorFormatter.js';

// ==========================================
// CENTRALIZED ERROR HANDLER
// ==========================================
export function centralizedErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown';
  const isProd = isProductionLikeEnvironment();
  const errorName = err?.name || 'Error';
  const errorCode = err?.code || '';
  
  // Determine standard HTTP status code
  let statusCode = err.statusCode || err.status;
  if (!statusCode) {
    if (err instanceof z.ZodError || err?.name === 'ZodError' || (err instanceof SyntaxError && 'body' in err)) {
      statusCode = 400;
    } else if (errorCode === 'P2002') {
      statusCode = 409; // Conflict (duplicate unique key)
    } else if (errorCode === 'P2025') {
      statusCode = 404; // Record not found
    } else if (errorCode === 'P2003') {
      statusCode = 400; // Foreign key constraint violation
    } else if (errorName === 'JsonWebTokenError' || errorName === 'TokenExpiredError') {
      statusCode = 401; // Unauthorized
    } else {
      statusCode = 500;
    }
  }

  // Safe server-side telemetry logging (PII scrubbed)
  if (statusCode >= 500) {
    logger.error('OPERATIONAL_SYSTEM_ERROR', err, {
      requestId,
      url: req.originalUrl || req.url,
      method: req.method,
      statusCode,
      errorCode
    });
  } else {
    logger.warn('LOGICAL_CLIENT_ERROR', {
      requestId,
      url: req.originalUrl || req.url,
      method: req.method,
      statusCode,
      errorName,
      errorCode
    });
  }

  // 1. Zod Validation Errors
  if (err instanceof z.ZodError || err?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_FAILED',
      error: 'VALIDATION_FAILED',
      message: 'Input data tidak memenuhi spesifikasi validasi.',
      details: err.issues?.map((i: any) => ({
        field: i.path.join('.'),
        message: i.message
      })),
      requestId
    });
  }

  // 2. Syntax or Parsing Error (JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      error: 'INVALID_JSON',
      message: 'Format payload JSON tidak dapat diproses.',
      requestId
    });
  }

  // 3. Prisma Database Errors (Prevent DB schema/SQL leaks with dynamic context)
  if (errorCode === 'P2002') {
    const p2002Info = formatP2002ErrorMessage(err);
    return res.status(409).json({
      success: false,
      code: p2002Info.code,
      error: p2002Info.code,
      message: p2002Info.message,
      ...(p2002Info.field ? { field: p2002Info.field } : {}),
      requestId
    });
  }

  if (errorCode === 'P2025') {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      error: 'NOT_FOUND',
      message: 'Data yang diminta tidak ditemukan.',
      requestId
    });
  }

  // 4. JWT Authentication Errors
  if (errorName === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      error: 'TOKEN_EXPIRED',
      message: 'Sesi autentikasi telah berakhir. Silakan masuk kembali.',
      requestId
    });
  }

  if (errorName === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      error: 'INVALID_TOKEN',
      message: 'Token autentikasi tidak valid.',
      requestId
    });
  }

  // 5. General Error Response (strictly generic in production to prevent stack/path leakage)
  const safeMessage = isProd
    ? (statusCode >= 500
      ? 'Terjadi kesalahan internal pada server. Silakan coba beberapa saat lagi.'
      : 'Permintaan tidak dapat diproses.')
    : (err.message || 'Terjadi kesalahan pada server.');

  const responseErrorCode = statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : (err.code || 'API_ERROR');

  res.status(statusCode).json({
    success: false,
    code: responseErrorCode,
    error: { code: responseErrorCode, message: safeMessage },
    message: safeMessage,
    requestId
  });
}
