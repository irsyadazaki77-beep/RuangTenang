const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add /api/v1/readyz
const readyzCode = `
  // 4. Liveness & Readiness Endpoints (Sanitized in Production)
  app.get(['/api/v1/health', '/api/health', '/health', '/healthz'], (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  app.get(['/api/v1/readyz', '/readyz'], async (_req, res) => {
    try {
      await serverDb.getAppointments(undefined, 1, 0); // Minimal DB ping
      res.status(200).json({ status: 'ready', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'not_ready', database: 'disconnected' });
    }
  });
`;
code = code.replace(/ {2}\/\/ 4. Liveness & Readiness Endpoints[^]*? {2}\}\);/, readyzCode.trim());

// Add graceful shutdown
const gracefulCode = `
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(\`Server RuangTenang running on http://0.0.0.0:\${PORT}\`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(\`\n[\${signal}] Shutting down gracefully...\`);
    server.close(async () => {
      console.log('HTTP server closed.');
      // Add other cleanup here (e.g., Prisma disconnect, Redis quit)
      process.exit(0);
    });
    
    // Fallback timeout
    setTimeout(() => {
      console.error('Forcing shutdown after 10 seconds...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
`;
code = code.replace(/ {2}app\.listen\(PORT, '0\.0\.0\.0', \(\) => \{[^]*? {2}\}\);/, gracefulCode.trim());

fs.writeFileSync('server.ts', code);
