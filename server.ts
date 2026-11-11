import 'dotenv/config';
import './server/config/loadFileSecrets.js';
import { ensureDatabaseReady, prisma } from './server/database.js';
import { redisService } from './server/services/redisService.js';
import { validateStartupEnvironment } from './server/apiV1Helpers.js';
import { parsePort } from './server/config/port.js';
import { validateEnvironment } from './server/config/envValidation.js';
import { installProductionConsoleSanitizer } from './server/utils/logger.js';
import { ensureOllamaRunning } from './server/services/ai/ollamaRuntime.js';
import { createApp } from './server/app.js';

async function startServer() {
  // Strict Fail-Closed Startup: Environment & Database readiness must pass or process halts
  validateEnvironment();
  validateStartupEnvironment();
  await ensureDatabaseReady();

  let PORT = 3000;
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = Number(process.argv[portArgIdx + 1]);
    if (!isNaN(parsed) && parsed > 0) PORT = parsed;
  } else if (process.env.PORT) {
    try {
      PORT = parsePort(process.env.PORT, 3000);
    } catch {
      PORT = 3000;
    }
  } else {
    PORT = 3000;
  }

  // Initialize modular Express application instance
  const app = await createApp({ port: PORT });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server RuangTenang running at:`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://127.0.0.1:${PORT}\n`);

    // Asynchronously initialize background cron jobs without blocking HTTP port startup
    setImmediate(async () => {
      try {
        const { initRetentionCronJobs } = await import('./server/jobs/cronRetention.js');
        initRetentionCronJobs();
        
        const { startAppointmentReminderJob } = await import('./server/jobs/appointmentReminderJob.js');
        startAppointmentReminderJob();
      } catch (err) {
        console.error('Failed to initialize background cron jobs:', err);
      }
    });

    if (process.env.LOCAL_AI_ONLY === 'true') {
      ensureOllamaRunning().then(async ok => {
        if (ok) {
          console.log('🤖 Ollama daemon terdeteksi dan aktif untuk Local AI (Bebas Kuota).');
          try {
            const { prewarmOllamaModel } = await import('./server/services/ai/ollamaRuntime.js');
            const warm = await prewarmOllamaModel('si-pinter:latest');
            if (warm.success) {
              console.log(`⚡ Model Si Pinter siap di VRAM GPU (${warm.durationMs}ms pre-warm).`);
            }
          } catch {}
        }
      }).catch(() => {});
    }
  });

  // Graceful Shutdown
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[${signal}] Initiating graceful shutdown...`);

    // Fallback timeout to prevent hanging
    const forceExitTimer = setTimeout(() => {
      console.error('[SHUTDOWN] Forcing shutdown after 10 seconds timeout...');
      process.exit(1);
    }, 10000);
    if (forceExitTimer.unref) forceExitTimer.unref();

    server.close(async (err) => {
      if (err) {
        console.error('[SHUTDOWN] Error closing HTTP server:', err);
      } else {
        console.log('[SHUTDOWN] HTTP server closed. No longer accepting new connections.');
      }

      try {
        await redisService.disconnect();
        console.log('[SHUTDOWN] Redis connections closed.');
      } catch (redisErr) {
        console.warn('[SHUTDOWN] Redis disconnect warning:', redisErr);
      }

      try {
        await prisma.$disconnect();
        console.log('[SHUTDOWN] Prisma database connection closed.');
      } catch (dbErr) {
        console.warn('[SHUTDOWN] Database disconnect warning:', dbErr);
      }

      clearTimeout(forceExitTimer);
      console.log('[SHUTDOWN] Graceful shutdown complete. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

installProductionConsoleSanitizer();

startServer().catch((err) => {
  console.error('FATAL STARTUP ERROR: RuangTenang server failed to initialize:', err?.message || err);
  process.exit(1);
});
