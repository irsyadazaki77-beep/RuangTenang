import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from './database.js';
import { validateEnvironment } from './config/envValidation.js';
import { logger } from './utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      idempotencyKey?: string;
      user?: {
        userId: string;
        role: 'mahasiswa' | 'konselor' | 'admin';
        name: string;
        email: string;
        sessionId?: string;
      };
    }
  }
}

function sanitizeUrlForLogs(rawUrl: string): string {
  try {
    const [pathname, queryString] = rawUrl.split('?');
    if (!queryString) return pathname;
    const params = new URLSearchParams(queryString);
    const SENSITIVE_KEYS = ['token', 'secret', 'email', 'code', 'key', 'password', 'mfa', 'auth'];
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
        params.set(key, '[REDACTED]');
      }
    }
    return `${pathname}?${params.toString()}`;
  } catch {
    return rawUrl;
  }
}

function pseudonymizeIp(ip: string | string[]): string {
  const ipStr = Array.isArray(ip) ? ip[0] : ip;
  return crypto.createHash('sha256').update(ipStr || '127.0.0.1').digest('hex').slice(0, 16);
}

// ==========================================
// 1. ENVIRONMENT VALIDATION ON STARTUP
// ==========================================
export function validateStartupEnvironment(): {
  isValid: boolean;
  warnings: string[];
  config: Record<string, string>;
} {
  // Enforce production security fail-fast
  validateEnvironment();

  const warnings: string[] = [];
  const env = process.env.NODE_ENV || 'development';
  const port = '3000';
  const jwtSecret = process.env.JWT_SECRET;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    warnings.push('GEMINI_API_KEY tidak terkonfigurasi. Fitur obrolan AI akan menggunakan panduan reflektif lokal.');
  }

  console.log(`==========================================`);
  console.log(`[STARTUP ENV VALIDATION] Status Environment`);
  console.log(`- NODE_ENV        : ${env}`);
  console.log(`- PORT            : ${port}`);
  console.log(`- JWT_SECRET      : ${jwtSecret ? 'TERSEDIA' : 'NOT SET'}`);
  console.log(`- GEMINI_API_KEY  : ${geminiKey ? 'TERSEDIA' : 'TIDAK ADA (FALLBACK COMPANION)'}`);
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`  ⚠️  [PERINGATAN STARTUP]: ${w}`));
  }
  console.log(`==========================================`);

  return {
    isValid: true,
    warnings,
    config: {
      NODE_ENV: env,
      PORT: port,
      JWT_SECRET_SET: jwtSecret ? 'true' : 'false',
      GEMINI_API_KEY_SET: geminiKey ? 'true' : 'false'
    }
  };
}

// ==========================================
// 2. REQUEST ID & STRUCTURED LOGGER
// ==========================================
export function requestIdAndLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const isApiRequest = req.url.startsWith('/api') || req.url.startsWith('/docs') || req.url.startsWith('/openapi');
  if (!isApiRequest) {
    return next();
  }

  const startTime = Date.now();
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const clientIpHash = pseudonymizeIp(rawIp as string);
  const cleanUrl = sanitizeUrlForLogs(req.originalUrl || req.url);

  // Log incoming request with sanitized URL and pseudonymized IP
  console.log(JSON.stringify({
    event: 'HTTP_REQUEST_IN',
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: cleanUrl,
    ipHash: clientIpHash,
  }));

  // Log outgoing response
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    console.log(JSON.stringify({
      event: 'HTTP_RESPONSE_OUT',
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: cleanUrl,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader('content-length') || 0
    }));
  });

  next();
}

// ==========================================
// 3. TIMEOUT & ABORT REQUEST MIDDLEWARE
// ==========================================
export function timeoutMiddleware(timeoutMs: number = 15000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl?.includes('/stream') || req.url?.includes('/stream')) {
      return next();
    }
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'REQUEST_TIMEOUT',
          message: 'Permintaan melebihi batas waktu (15 detik). Silakan coba beberapa saat lagi.',
          requestId: req.requestId
        });
      }
    }, timeoutMs);

    // Clear timeout on response finish
    res.on('finish', () => {
      clearTimeout(timer);
    });

    // Detect client disconnect
    req.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
}

// ==========================================
// 4. IDEMPOTENCY KEY STORE & MIDDLEWARE
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

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
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
    return next();
  }

  req.idempotencyKey = rawKey;

  // Derive isolated subject namespace from authenticated user, session, or IP
  const subject = req.user?.userId || req.user?.sessionId || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const method = req.method.toUpperCase();
  const route = (req.baseUrl || '') + (req.path || (req.originalUrl || req.url).split('?')[0]);
  
  // Composite namespaced storage key
  const compositeKey = `${subject}:${method}:${route}:${rawKey}`;

  // Request body fingerprinting using SHA-256
  const bodyString = JSON.stringify(req.body || {});
  const currentBodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');

  try {
    // Check if composite key exists in store
    const cached = await prisma.idempotencyRecord.findUnique({
      where: { key: compositeKey }
    });

    if (cached) {
      // Verify body fingerprint match
      if (cached.requestHash !== currentBodyHash) {
        console.warn(`[IDEMPOTENCY_CONFLICT] Key '${rawKey}' reused with different body fingerprint by subject '${subject}'`);
        return res.status(409).json({
          success: false,
          error: 'IDEMPOTENCY_CONFLICT',
          message: 'Idempotency key sama digunakan dengan payload request yang berbeda.',
          requestId: req.requestId
        });
      }

      console.log(`[IDEMPOTENCY_MATCH] Returning cached response for composite key: ${compositeKey}`);
      try {
        const parsedBody = JSON.parse(cached.responseBody);
        return res.status(cached.responseStatus).json({
          ...parsedBody,
          isIdempotentReplay: true,
          requestId: req.requestId
        });
      } catch (e) {
        console.error('[IDEMPOTENCY_ERROR] Failed to parse cached response:', e);
      }
    }

    // Intercept json response to cache it safely for mutation requests
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour retention
        
        prisma.idempotencyRecord.upsert({
          where: { key: compositeKey },
          update: {
            requestHash: currentBodyHash,
            responseStatus: res.statusCode,
            responseBody: JSON.stringify(body),
            expiresAt,
          },
          create: {
            key: compositeKey,
            userId: req.user?.userId || null,
            route,
            method,
            requestHash: currentBodyHash,
            responseStatus: res.statusCode,
            responseBody: JSON.stringify(body),
            expiresAt,
          }
        }).catch(err => {
          console.error('[IDEMPOTENCY_SAVE_ERROR] Failed to save idempotency:', err);
        });
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('[IDEMPOTENCY_MIDDLEWARE_ERROR] Failed during checking:', err);
    next();
  }
}

// ==========================================
// 5. PAGINATION VALIDATOR & SANITIZER
// ==========================================
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function validatePagination(req: Request, defaultLimit = 20): PaginationParams {
  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;

  let page = 1;
  let limit = defaultLimit;

  if (pageRaw !== undefined) {
    const parsedPage = parseInt(String(pageRaw), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  if (limitRaw !== undefined) {
    if (String(limitRaw).toLowerCase() === 'all') {
      limit = 100; // Cap 'all' to hard limit of 100
    } else {
      const parsedLimit = parseInt(String(limitRaw), 10);
      if (!isNaN(parsedLimit) && parsedLimit >= 1) {
        limit = Math.min(parsedLimit, 100); // Cap max limit to 100
      }
    }
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// ==========================================
// 6. SAFE RETRY UTILITY
// ==========================================
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) {
        throw err;
      }
      console.warn(`[SAFE_RETRY] Attempt ${attempt}/${retries} failed. Retrying in ${delayMs}ms... Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('All retry attempts exhausted');
}

// ==========================================
// 7. OPENAPI 3.0 SPECIFICATION & DOCUMENTATION
// ==========================================
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'RuangTenang Kampus Mental Health API',
    version: '1.0.0',
    description: 'API v1 produksi untuk platform kesehatan mental & konseling mahasiswa Indonesia dengan AI, screening PHQ-9/GAD-7, dan pemicu SOS darurat.',
    contact: {
      name: 'Tim Pengembang RuangTenang Kampus',
      email: 'support@ruangtenang.ac.id'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Production Endpoint v1'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Pemeriksaan Kesehatan Database & AI System',
        description: 'Memeriksa konektivitas database persistent, status AI Gemini, uptime, serta statistik sistem.',
        responses: {
          '200': {
            description: 'Sistem Sehat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', example: '2026-08-04T04:46:00.000Z' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'UP' },
                        ai: { type: 'string', example: 'UP' }
                      }
                    },
                    uptimeSeconds: { type: 'number', example: 1245.5 },
                    requestId: { type: 'string', example: 'd8a7c2e1-4b3f-4e92-b8d1-7c2a3f8b9e10' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Registrasi Akun Baru (Mahasiswa / Konselor / Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'Ahmad Mahasiswa' },
                  email: { type: 'string', example: 'ahmad@ui.ac.id' },
                  password: { type: 'string', example: 'sandi123' },
                  role: { type: 'string', enum: ['mahasiswa', 'konselor', 'admin'], example: 'mahasiswa' },
                  university: { type: 'string', example: 'Universitas Indonesia' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Registrasi Berhasil' },
          '400': { description: 'Email Sudah Terdaftar / Validasi Gagal' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Masuk Sesi Pengguna',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'ahmad@ui.ac.id' },
                  password: { type: 'string', example: 'sandi123' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login Berhasil' },
          '401': { description: 'Kredensial Tidak Valid' }
        }
      }
    },
    '/db/appointments': {
      get: {
        summary: 'Dapatkan Daftar Janji Temu Konseling (Dengan Pagination)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'string', default: '10' } },
          { name: 'status', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Daftar Janji Temu Terformat DTO' }
        }
      },
      post: {
        summary: 'Buat Janji Temu Konseling Baru (Mendukung X-Idempotency-Key)',
        parameters: [
          { name: 'X-Idempotency-Key', in: 'header', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['counselorName', 'date', 'time'],
                properties: {
                  counselorId: { type: 'string', example: 'cons-1' },
                  counselorName: { type: 'string', example: 'Dr. Anita Rahmawati, M.Psi.' },
                  date: { type: 'string', example: '2026-08-10' },
                  time: { type: 'string', example: '10:30' },
                  timezone: { type: 'string', enum: ['WIB', 'WITA', 'WIT'], example: 'WIB' },
                  mode: { type: 'string', example: 'Online Video Call' },
                  notes: { type: 'string', example: 'Kecemasan ujian' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Janji Temu Berhasil Dibuat' },
          '409': { description: 'Konflik Jadwal Slot Penuh' }
        }
      }
    },
    '/sos/trigger': {
      post: {
        summary: 'Pemicu Protokol Darurat SOS Kampus (Mendukung X-Idempotency-Key)',
        parameters: [
          { name: 'X-Idempotency-Key', in: 'header', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emergencyContact', 'hasUserConsent'],
                properties: {
                  emergencyContact: {
                    type: 'object',
                    required: ['name', 'phone'],
                    properties: {
                      name: { type: 'string', example: 'Bapak Kandung' },
                      phone: { type: 'string', example: '081234567890' }
                    }
                  },
                  hasUserConsent: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Sinyal SOS Darurat Berhasil Ditransmisikan' }
        }
      }
    }
  }
};

export function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>API Dokumentasi OpenAPI Swagger - RuangTenang Kampus</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: sans-serif; }
    .top-bar-banner { background: #0f172a; color: #ffffff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .top-bar-banner h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .top-bar-banner span { font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="top-bar-banner">
    <h1>🌱 RuangTenang Kampus — Dokumentasi API v1 (OpenAPI 3.0)</h1>
    <span>Prefix Endpoint: /api/v1</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/v1/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

// ==========================================
// 8. AI TELEMETRY & AUDIT TRAIL LOGGING
// ==========================================
export interface AiTelemetryData {
  latencyMs: number;
  promptTokenCount: number;
  responseTokenCount: number;
  crisisFlagDetected: boolean;
  crisisType?: 'self_harm' | 'medical_diagnosis' | 'emergency' | null;
  modelUsed: string;
  requestId: string;
  timestamp: string;
}

export function logAiTelemetry(data: AiTelemetryData) {
  // Strip any PII, only log metric fields
  const safeLogPayload = {
    event: 'AI_COMPANION_METRICS',
    timestamp: data.timestamp,
    latencyMs: data.latencyMs,
    promptTokenCount: data.promptTokenCount,
    responseTokenCount: data.responseTokenCount,
    totalTokens: data.promptTokenCount + data.responseTokenCount,
    crisisFlagDetected: data.crisisFlagDetected,
    crisisType: data.crisisType || null,
    modelUsed: data.modelUsed,
    requestId: data.requestId
  };

  // Log to standard out for telemetry ingestions (Datadog, ELK, etc.)
  console.log(JSON.stringify(safeLogPayload));
}

// ==========================================
// 9. CENTRALIZED ERROR HANDLER
// ==========================================
export function centralizedErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown';
  const isProd = process.env.NODE_ENV === 'production';
  const errorMessage = err?.message || 'Unknown error';
  
  // Custom HTTP status error
  const statusCode = err.statusCode || err.status || (err instanceof z.ZodError || err?.name === 'ZodError' || (err instanceof SyntaxError && 'body' in err) ? 400 : 500);

  // Distinguish logical error (4xx) vs operational/system error (5xx) in logs
  if (statusCode >= 500) {
    logger.error('OPERATIONAL_SYSTEM_ERROR', err, {
      requestId,
      url: req.originalUrl || req.url,
      method: req.method,
      statusCode
    });
  } else {
    logger.warn('LOGICAL_CLIENT_ERROR', {
      requestId,
      url: req.originalUrl || req.url,
      method: req.method,
      statusCode,
      errorName: err.name,
      errorMessage: isProd ? '[REDACTED_PROD]' : errorMessage
    });
  }

  // Zod Validation Errors
  if (err instanceof z.ZodError || err?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Input data tidak memenuhi spesifikasi validasi.',
      details: err.issues?.map((i: any) => ({
        field: i.path.join('.'),
        message: i.message
      })),
      requestId
    });
  }

  // Syntax or Parsing Error (JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON',
      message: 'Format payload JSON tidak dapat diproses.',
      requestId
    });
  }

  const userMessage = err.message || 'Terjadi kesalahan internal pada server.';

  res.status(statusCode).json({
    success: false,
    error: { code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR', message: isProd && statusCode >= 500 ? 'Terjadi kesalahan internal pada server.' : userMessage },
    code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR',
    message: isProd && statusCode >= 500 ? 'Terjadi kesalahan internal pada server.' : userMessage,
    requestId
  });
}
