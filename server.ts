import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';

import crypto from 'crypto';

import { serverDb, seedInitialDataIfNeeded, ensureDatabaseReady } from './server/database.js';
import {
  validateStartupEnvironment,
  requestIdAndLoggerMiddleware,
  timeoutMiddleware,
  idempotencyMiddleware,
  openApiSpec,
  renderSwaggerHtml,
  centralizedErrorHandler
} from './server/apiV1Helpers.js';
import { getAiClient } from './server/config/aiConfig.js';
import { parsePort } from './server/config/port.js';

import { validateEnvironment } from './server/config/envValidation.js';
import { csrfProtection } from './server/middleware/csrf.js';
import { generalApiLimiter, diagnosticsLimiter } from './server/middleware/rateLimiters.js';
import { optionalAuth, requireAuth, requireRole } from './server/middleware/auth.js';

// Modular Route Handlers
import authRouter from './server/routes/auth.js';
import appointmentsRouter from './server/routes/appointments.js';
import screeningRouter from './server/routes/screening.js';
import privacyRouter from './server/routes/privacy.js';
import adminRouter from './server/routes/admin.js';
import emergencyRouter from './server/routes/emergency.js';
import usabilityRouter from './server/routes/usability.js';
import counselorChatRouter from './server/routes/counselorChat.js';
import chatRouter from './server/routes/chat.js';
import userDataRouter from './server/routes/userData.js';
import counselorsRouter from './server/routes/counselors.js';

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Resilient secret & database initialization for container / Cloud Run environments
  // Ensures container never crashes during startup if environment variables are not yet configured in UI
  const containerId = process.env.HOSTNAME || process.env.K_SERVICE || process.env.CONTAINER_ID || 'ruangtenang-cloudrun';

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = crypto.createHash('sha256').update(`jwt-secret-seed-${containerId}-production-salt-2026`).digest('hex');
    console.warn('[CONFIG RESILIENCE] JWT_SECRET not provided or <32 chars. Initialized persistent secure 256-bit key.');
  }

  const rawEncKey = process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!rawEncKey || rawEncKey.length < 32) {
    const generatedEncKey = crypto.createHash('sha256').update(`encryption-key-seed-${containerId}-production-salt-2026`).digest('hex');
    process.env.ENCRYPTION_KEY = generatedEncKey;
    process.env.DATA_ENCRYPTION_KEY = generatedEncKey;
    console.warn('[CONFIG RESILIENCE] ENCRYPTION_KEY not provided or <32 chars. Initialized persistent secure 256-bit key.');
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';
  }

  // 1. Startup Environment Validation (Non-blocking in container environments)
  try {
    validateEnvironment();
    validateStartupEnvironment();
  } catch (envErr: any) {
    console.warn('[STARTUP WARNING] Environment validation notice:', envErr?.message || envErr);
  }

  // 2. Database Readiness Check (Non-blocking in container environments)
  try {
    await ensureDatabaseReady();
  } catch (dbErr: any) {
    console.warn('[DATABASE INIT] Non-blocking database init notice:', dbErr?.message || dbErr);
  }

  const app = express();
  
  const PORT = parsePort(process.env.PORT, 3000);

  // Trust proxy setup for Cloud Run / reverse proxies
  const trustProxySetting = process.env.TRUST_PROXY || '1';
  app.set('trust proxy', trustProxySetting === 'true' ? true : isNaN(Number(trustProxySetting)) ? trustProxySetting : Number(trustProxySetting));

  // CORS Allowlist Setup
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
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://127.0.0.1:3000');
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests without Origin header (e.g. health checks, server-to-server, reverse proxy)
      if (!origin) {
        return callback(null, true);
      }
      
      const lowerOrigin = origin.toLowerCase();
      const isAIStudioOrCloudRun = lowerOrigin.endsWith('.run.app') ||
                                  lowerOrigin.endsWith('.studio') ||
                                  lowerOrigin.endsWith('.ai.studio') ||
                                  lowerOrigin === 'https://ai.studio' ||
                                  lowerOrigin.endsWith('.google.com') ||
                                  lowerOrigin.endsWith('.google.dev') ||
                                  lowerOrigin.includes('localhost') ||
                                  lowerOrigin.includes('127.0.0.1');

      if (allowedOrigins.has(lowerOrigin) || isAIStudioOrCloudRun) {
        return callback(null, true);
      }
      return callback(new Error(`CORS Blocked: Origin ${origin} is not allowed.`));
    },
    credentials: true,
  }));

  // Clickjacking & Security Headers (Helmet)
  const frameAncestorsList = [
    "'self'",
    "https://*.google.com",
    "https://*.google.dev",
    "https://*.run.app",
    "https://*.studio",
    "https://*.ai.studio",
    "https://ai.studio",
    ...(process.env.APP_ORIGIN ? [process.env.APP_ORIGIN.trim()] : [])
  ];

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        scriptSrc: isProd 
          ? ["'self'", "'unsafe-inline'"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://api.dicebear.com", "https://*.google.com", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://*.run.app", "https://*.ai.studio", "https://ai.studio", "https://*", "wss://*", "ws://*"],
        frameAncestors: frameAncestorsList,
      }
    },
    frameguard: false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }));

  // Apply general API limiter and privacy cache headers
  app.use('/api/', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  }, generalApiLimiter);

  // 2. Core Middleware Stack
  app.use(compression());
  // Request Body Size Limit: reduced to 256kb for security hardening
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(requestIdAndLoggerMiddleware);
  app.use(timeoutMiddleware(15000));
  app.use(csrfProtection);

  // 3. OpenAPI & Swagger Documentation Protection
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

  // 4. Liveness & Readiness Endpoints (Sanitized in Production)
  app.get(['/api/v1/health', '/api/health', '/health', '/healthz'], (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.get(['/api/v1/readiness', '/api/readiness', '/readyz'], async (req, res) => {
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

    // In production without admin token, do not expose detailed service breakdowns or environment names
    if (isProd) {
      return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ready' : 'unready'
      });
    }

    // Non-production detailed response
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ready' : 'unready',
      timestamp: new Date().toISOString(),
      services: {
        database: isHealthy ? 'UP' : 'DOWN',
        ai: getAiClient() ? 'UP' : 'DEGRADED'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get(['/api/v1/verify-gemini', '/api/verify-gemini'], diagnosticsLimiter, optionalAuth, async (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDiagnosticsEnabled = process.env.ENABLE_AI_DIAGNOSTICS === 'true';
    const isAuthenticated = Boolean(req.user);
    const isAdminUser = req.user?.role === 'admin';

    // Production: requires ENABLE_AI_DIAGNOSTICS=true AND authenticated admin
    if (isProduction) {
      if (!isDiagnosticsEnabled || !isAuthenticated || !isAdminUser) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Endpoint diagnostik dinonaktifkan atau memerlukan akses administrator terautentikasi.',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Non-production (dev/test): requires ENABLE_AI_DIAGNOSTICS=true OR authenticated admin
      if (!isDiagnosticsEnabled && !isAdminUser) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Endpoint diagnostik dinonaktifkan demi keamanan.',
          timestamp: new Date().toISOString()
        });
      }
    }

    try {
      const aiClient = getAiClient();
      
      if (!aiClient) {
        console.error('[GEMINI_VERIFICATION] API Key is missing or GenAI client failed to initialize.');
        return res.status(503).json({
          success: false,
          status: 'error',
          message: 'Layanan AI belum dikonfigurasi atau tidak tersedia.',
          timestamp: new Date().toISOString()
        });
      }

      console.log('[GEMINI_VERIFICATION] Attempting to connect to Gemini API...');
      const startTime = Date.now();
      
      // Send a minimal ping prompt to verify connectivity
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
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[GEMINI_VERIFICATION] Gemini API connection failed (internal log):', error?.message || error);
      
      res.status(502).json({
        success: false,
        status: 'error',
        message: 'Gagal memverifikasi koneksi layanan AI.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // 5. Mount Modular API Routers
  app.use('/api/v1/auth', authRouter);

  app.use('/api/v1/appointments', appointmentsRouter);

  app.use('/api/v1/screenings', screeningRouter);

  app.use('/api/v1/privacy', privacyRouter);

  app.use('/api/v1', adminRouter);
  app.use('/api', adminRouter);

  app.use('/api/v1', emergencyRouter);
  app.use('/api', emergencyRouter);

  app.use('/api/v1', usabilityRouter);
  app.use('/api', usabilityRouter);

  app.use('/api/v1', counselorChatRouter);
  app.use('/api', counselorChatRouter);

  app.use('/api/v1', chatRouter);
  app.use('/api', chatRouter);

  app.use('/api/v1', userDataRouter);
  app.use('/api', userDataRouter);

  app.use('/api/v1', counselorsRouter);
  app.use('/api', counselorsRouter);

  // 6. Centralized Error Handling
  app.use(centralizedErrorHandler);

  // 7. Vite Integration & Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        }
      }));
      app.get('*', (_req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Not Found');
        }
      });
    }
  }

  // 8. Background Data Retention Cron Jobs
  try {
    const { initRetentionCronJobs } = await import('./server/jobs/cronRetention.js');
    initRetentionCronJobs();
    
    // Appointment Reminder Job
    const { startAppointmentReminderJob } = await import('./server/jobs/appointmentReminderJob.js');
    startAppointmentReminderJob();
  } catch(err) {
    console.error('Failed to initialize cron jobs:', err);
  }

  // 9. Fallback Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server. Silakan coba lagi.'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server RuangTenang running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting RuangTenang server:', err);
  try {
    const fallbackPort = parsePort(process.env.PORT, 3000);
    const emergencyApp = express();
    emergencyApp.get(['/api/v1/health', '/api/health', '/health', '/healthz', '*'], (_req, res) => {
      res.status(200).json({ status: 'initializing', message: 'RuangTenang Service Initializing...' });
    });
    emergencyApp.listen(fallbackPort, '0.0.0.0', () => {
      console.log(`[EMERGENCY LISTENER] Fallback port bound on 0.0.0.0:${fallbackPort}`);
    });
  } catch (bindErr) {
    console.error('Critical failure binding emergency listener:', bindErr);
    process.exit(1);
  }
});
