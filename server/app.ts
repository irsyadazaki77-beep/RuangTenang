import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';

import { serverDb } from './database.js';
import {
  requestIdAndLoggerMiddleware,
  timeoutMiddleware,
  openApiSpec,
  renderSwaggerHtml,
  centralizedErrorHandler
} from './apiV1Helpers.js';
import { getAiClient, isAiAvailable } from './config/aiConfig.js';
import { csrfProtection } from './middleware/csrf.js';
import {
  generalApiLimiter,
  diagnosticsLimiter,
  clientTelemetryLimiter,
  getRateLimitStoreMetrics,
  getRateLimitStorePrometheus
} from './middleware/rateLimiters.js';
import { optionalAuth, requireAuth, requireRole } from './middleware/auth.js';
import { clientTelemetryService, clientDebugSchema } from './services/clientTelemetryService.js';
import { metricsService } from './services/metricsService.js';
import { aiMetricsService } from './services/ai/aiMetricsService.js';
import { isLocalDevelopmentOrTest, isProductionLikeEnvironment } from './config/environment.js';
import { buildContentSecurityPolicyDirectives } from './config/contentSecurityPolicy.js';
import { createApiRouter } from './routes/index.js';

export interface AppOptions {
  port?: number;
}

export async function createApp(options: AppOptions = {}): Promise<Express> {
  const isProd = isProductionLikeEnvironment();
  const PORT = options.port || 3000;
  const isPreviewMode = isLocalDevelopmentOrTest();

  const app = express();

  // Trust proxy setup for Cloud Run / reverse proxies
  const trustProxySetting = process.env.TRUST_PROXY || '1';
  app.set(
    'trust proxy',
    trustProxySetting === 'true' ? true : isNaN(Number(trustProxySetting)) ? trustProxySetting : Number(trustProxySetting)
  );

  // CORS Exact Allowlist Setup
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

  if (isLocalDevelopmentOrTest()) {
    allowedOrigins.add(`http://localhost:${PORT}`);
    allowedOrigins.add(`http://127.0.0.1:${PORT}`);
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
    allowedOrigins.add('http://localhost:5173');
    allowedOrigins.add('http://127.0.0.1:5173');
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, allowedOrigins.has(origin.toLowerCase()));
      },
      credentials: true,
    })
  );

  const trustedOriginsList = [
    ...(process.env.APP_ORIGIN ? process.env.APP_ORIGIN.split(',').map(o => o.trim()).filter(Boolean) : []),
    ...(process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) : []),
  ];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: buildContentSecurityPolicyDirectives(trustedOriginsList, {
          production: isProd,
          preview: isPreviewMode,
        }),
      },
      frameguard: false,
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      crossOriginEmbedderPolicy: isPreviewMode ? false : { policy: 'credentialless' },
      crossOriginOpenerPolicy: isPreviewMode ? false : { policy: 'same-origin' },
      crossOriginResourcePolicy: isPreviewMode ? false : { policy: 'same-origin' },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
  );

  // Permissions-Policy & Privacy Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()'
    );
    next();
  });

  // Apply general API limiter, privacy cache headers, and noindex robots protection
  app.use(
    '/api/',
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      next();
    },
    generalApiLimiter
  );

  // Core Middleware Stack
  app.use((compression as any)());
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(requestIdAndLoggerMiddleware);
  app.use(timeoutMiddleware(15000));
  app.use(csrfProtection);

  app.post(
    '/api/v1/security/csp-report',
    generalApiLimiter,
    express.raw({ type: ['application/csp-report', 'application/reports+json'], limit: '16kb' }),
    (_req, res) => {
      metricsService.recordSecurityEvent('csp_violation');
      res.status(204).end();
    }
  );

  // OpenAPI & Swagger Documentation Protection
  app.get(['/api/v1/openapi.json', '/api/openapi.json'], (_req, res) => {
    if (isProd && process.env.ENABLE_PUBLIC_DOCS !== 'true') {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Endpoint tidak ditemukan' });
    }
    res.json(openApiSpec);
  });

  app.get(['/api/v1/docs', '/api/docs', '/docs'], (_req, res) => {
    if (isProd && process.env.ENABLE_PUBLIC_DOCS !== 'true') {
      return res.status(404).send('Not Found');
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(renderSwaggerHtml());
  });

  // Liveness & Readiness Endpoints
  app.get(['/api/v1/health', '/api/health', '/health', '/healthz'], (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  // Asynchronous client telemetry endpoint
  app.post(['/api/v1/client-debug', '/api/client-debug'], clientTelemetryLimiter, optionalAuth, async (req, res) => {
    const parsed = clientDebugSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload telemetry tidak valid.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message })),
        code: 'VALIDATION_ERROR',
        requestId: req.requestId,
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const result = await clientTelemetryService.recordClientError(parsed.data, {
      userId: req.user?.userId,
      requestId: req.requestId || 'req-telemetry',
      clientIp,
    });

    res.status(200).json({
      success: true,
      data: result,
      code: 'TELEMETRY_RECORDED',
      requestId: req.requestId,
    });
  });

  // Observability & System Operational Metrics (Prometheus / JSON)
  app.get(['/api/v1/metrics', '/metrics'], requireAuth, requireRole(['admin']), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const isPrometheus = req.headers.accept?.includes('text/plain');
    if (isPrometheus) {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return res.send(
        `${metricsService.toPrometheusText()}\n${aiMetricsService.toPrometheusText()}\n${getRateLimitStorePrometheus()}\n`
      );
    }
    return res.json({
      success: true,
      data: metricsService.getSnapshot(),
      rateLimiting: getRateLimitStoreMetrics(),
      requestId: req.requestId,
    });
  });

  app.get(['/api/v1/readiness', '/api/v1/readyz', '/api/readiness', '/api/readyz', '/readiness', '/readyz'], async (_req, res) => {
    let isHealthy = true;

    try {
      await serverDb.ping();
    } catch (e: any) {
      console.error('[READINESS] Database connection failed:', e.message);
      isHealthy = false;
    }

    if (!process.env.JWT_SECRET) {
      console.error('[READINESS] Critical config JWT_SECRET is missing');
      isHealthy = false;
    }

    if (isProd) {
      return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ready' : 'unready',
        database: isHealthy ? 'connected' : 'disconnected',
      });
    }

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ready' : 'unready',
      timestamp: new Date().toISOString(),
      services: {
        database: isHealthy ? 'UP' : 'DOWN',
        ai: isAiAvailable() ? 'UP' : 'DEGRADED',
      },
      environment: process.env.NODE_ENV || 'development',
    });
  });

  app.get(['/api/v1/verify-gemini', '/api/verify-gemini'], diagnosticsLimiter, optionalAuth, async (req, res) => {
    const isProduction = isProd;
    const isDiagnosticsEnabled = process.env.ENABLE_AI_DIAGNOSTICS === 'true';
    const isAuthenticated = Boolean(req.user);
    const isAdminUser = req.user?.role === 'admin';

    if (isProduction) {
      if (!isDiagnosticsEnabled || !isAuthenticated || !isAdminUser) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Endpoint diagnostik dinonaktifkan atau memerlukan akses administrator terautentikasi.',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      if (!isDiagnosticsEnabled && !isAdminUser) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Endpoint diagnostik dinonaktifkan demi keamanan.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (process.env.LOCAL_AI_ONLY === 'true' || process.env.DISABLE_CLOUD_AI === 'true') {
      return res.status(200).json({
        success: true,
        status: 'disabled',
        message: 'Layanan Cloud AI (Gemini) dinonaktifkan demi privasi dan kenyamanan. Sistem menggunakan mode AI Lokal murni.',
        provider: 'ollama',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const aiClient = getAiClient();
      if (!aiClient) {
        console.error('[GEMINI_VERIFICATION] API Key is missing or GenAI client failed to initialize.');
        return res.status(503).json({
          success: false,
          status: 'error',
          message: 'Layanan AI belum dikonfigurasi atau tidak tersedia.',
          timestamp: new Date().toISOString(),
        });
      }

      console.log('[GEMINI_VERIFICATION] Attempting to connect to Gemini API...');
      const startTime = Date.now();
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: 'Ping! Balas dengan "Pong" saja.',
      });
      const latency = Date.now() - startTime;
      const textResponse = response.text ? 'OK' : 'EMPTY_RESPONSE';

      res.status(200).json({
        success: true,
        status: 'success',
        latencyMs: latency,
        modelUsed: 'gemini-3.1-flash-lite',
        responseStatus: textResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[GEMINI_VERIFICATION] Gemini API connection failed (internal log):', error?.message || error);
      res.status(502).json({
        success: false,
        status: 'error',
        message: 'Gagal memverifikasi koneksi layanan AI.',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Mount Modular API Routers via Central Router Aggregator
  const apiRouter = createApiRouter();
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Dedicated 404 handler for unhandled /api/* routes before SPA fallback
  app.all('/api/*', (_req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      error: 'Endpoint API tidak ditemukan',
    });
  });

  // Centralized Error Handling
  app.use(centralizedErrorHandler);

  // Vite Integration & Static Assets
  const isBundledServer =
    typeof __filename !== 'undefined'
      ? __filename.endsWith('server.mjs')
      : Boolean(import.meta.url) && import.meta.url.includes('server.mjs');

  const useVite = isLocalDevelopmentOrTest() && process.env.SERVE_STATIC !== 'true' && !isBundledServer;

  if (useVite) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Security filter: Deny direct access to server build artifacts, scripts, source maps, prisma schemas, and env files
    app.use((req, res, next) => {
      const normalizedPath = req.path.toLowerCase();
      if (
        normalizedPath.endsWith('.cjs') ||
        normalizedPath.endsWith('.mjs') ||
        normalizedPath.endsWith('.map') ||
        normalizedPath.includes('.env') ||
        normalizedPath.endsWith('.prisma') ||
        normalizedPath.includes('/prisma') ||
        normalizedPath.includes('schema.') ||
        normalizedPath.endsWith('.ts') ||
        normalizedPath.includes('server.') ||
        normalizedPath.includes('database.') ||
        normalizedPath.includes('backuptool') ||
        normalizedPath.includes('rehearseencryptedbackup') ||
        normalizedPath.includes('backup')
      ) {
        return res.status(404).send('Not Found');
      }
      next();
    });

    const clientDistPath = path.join(process.cwd(), 'dist', 'client');
    const rootDistPath = path.join(process.cwd(), 'dist');
    const staticPath = fs.existsSync(clientDistPath) ? clientDistPath : rootDistPath;

    if (fs.existsSync(staticPath)) {
      app.use(
        express.static(staticPath, {
          maxAge: '1d',
          dotfiles: 'deny',
          index: 'index.html',
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-cache');
            } else if (filePath.endsWith('.map') || filePath.endsWith('.cjs')) {
              res.setHeader('Cache-Control', 'no-store');
            } else {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          },
        })
      );

      app.get('*', (_req, res) => {
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Not Found');
        }
      });
    }
  }

  // Fallback Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    });
  });

  return app;
}

export default createApp;
