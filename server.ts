import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

import { serverDb, seedInitialDataIfNeeded } from './server/database.js';
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

import { validateEnvironment } from './server/config/envValidation.js';
import { csrfProtection } from './server/middleware/csrf.js';

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

// Global API rate limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }
});

async function startServer() {
  // 1. Startup Environment Validation
  validateEnvironment();
  validateStartupEnvironment();

  const app = express();
  
  const rawPort = process.env.PORT || '3000';
  const PORT = parseInt(rawPort, 10);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(`FATAL: Invalid port configured: ${rawPort}`);
  }

  // Trust the first proxy to correctly resolve X-Forwarded-For
  app.set('trust proxy', 1);

  // Advanced security hardening (CSP, HSTS, X-Frame-Options)
  const isProd = process.env.NODE_ENV === 'production';
  
  const allowedOrigins = new Set<string>();
  if (process.env.APP_ORIGIN) {
    allowedOrigins.add(process.env.APP_ORIGIN.trim());
  }
  if (process.env.CORS_ALLOWED_ORIGINS) {
    process.env.CORS_ALLOWED_ORIGINS.split(',').forEach(o => {
      if (o.trim()) allowedOrigins.add(o.trim());
    });
  }

  if (!isProd) {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
    allowedOrigins.add('http://localhost:5173');
    allowedOrigins.add('http://127.0.0.1:5173');
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        if (isProd) {
          return callback(new Error('CORS Blocked: Missing origin not allowed in production.'));
        }
        return callback(null, true);
      }
      
      const isAIStudioPreview = origin.endsWith('.run.app') || origin.endsWith('.studio') || origin === 'https://ai.studio' || origin.endsWith('.google.com') || origin.endsWith('.google.dev');
      
      if (allowedOrigins.has(origin) || isAIStudioPreview) {
        return callback(null, true);
      }
      return callback(new Error(`CORS Blocked: Origin ${origin} is not allowed.`));
    },
    credentials: true,
  }));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        scriptSrc: isProd 
          ? ["'self'"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://api.dicebear.com", "https://*.google.com", "https://*.googleapis.com"],
        connectSrc: isProd
          ? ["'self'", "https://generativelanguage.googleapis.com"]
          : ["'self'", "https://*", "wss://*", "ws://*"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.google.dev", "https://*.run.app", "https://*.studio", "https://ai.studio"],
      }
    },
    frameguard: false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }));

  // Apply generic API limiter and no-cache
  app.use('/api/', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  }, apiLimiter);

  // Do NOT run demo seed automatically on server startup.
  // Production admin provisioning & demo seeding must be run explicitly.

  // 2. Core Middleware Stack
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use(requestIdAndLoggerMiddleware);
  app.use(timeoutMiddleware(15000));
  app.use(csrfProtection);

  // 3. OpenAPI & Swagger Documentation Routes
  app.get(['/api/v1/openapi.json', '/api/openapi.json'], (_req, res) => {
    res.json(openApiSpec);
  });

  app.get(['/api/v1/docs', '/api/docs', '/docs'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(renderSwaggerHtml());
  });

  // 4. Liveness & Readiness Endpoints
  // Liveness (Health) indicates the server process is alive
  app.get(['/api/v1/health', '/api/health', '/healthz'], (req, res) => {
    res.status(200).json({ status: 'healthy', uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
  });

  // Readiness indicates the application dependencies are ready
  app.get(['/api/v1/readiness', '/api/readiness', '/readyz'], async (req, res) => {
    let dbStatus = 'UP';
    let aiStatus = 'DEGRADED';
    let isHealthy = false;

    try {
      await serverDb.ping();
      dbStatus = 'UP';
      isHealthy = true;
    } catch (e: any) {
      console.error('[READINESS] Database connection failed:', e.message);
      dbStatus = 'DOWN';
    }

    const ai = getAiClient();
    if (ai) {
      aiStatus = 'UP';
    }
    
    // Critical configuration checks
    const hasSecret = !!process.env.JWT_SECRET;
    if (!hasSecret) {
       console.error('[READINESS] Critical config JWT_SECRET is missing');
       isHealthy = false;
    }

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ready' : 'unready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        ai: aiStatus
      },
      config: {
        jwt: hasSecret ? 'valid' : 'invalid'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 5. Mount Modular API Routers (supporting both /api/v1 and /api)
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
  process.exit(1);
});
