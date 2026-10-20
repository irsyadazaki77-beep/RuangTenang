import express from 'express';
import { maskSensitivePayload } from './utils/logger.js';
import { isProductionLikeEnvironment } from './config/environment.js';

const router = express.Router();

router.post('/log-error', (req, res) => {
  const isProd = isProductionLikeEnvironment();
  console.log('--- CLIENT ERROR LOG ---');
  
  // Clean PII and sensitive data recursively using maskSensitivePayload
  const sanitizedBody = maskSensitivePayload(req.body);

  if (isProd) {
    // Redact sensitive payload in production
    const safeBody = {
      ...sanitizedBody,
      message: sanitizedBody?.message || 'Error occurred',
      stack: '[REDACTED]',
      data: '[REDACTED]'
    };
    console.log(JSON.stringify(safeBody, null, 2));
  } else {
    console.log(JSON.stringify(sanitizedBody, null, 2));
  }
  console.log('------------------------');
  res.status(200).send('Logged');
});

export default router;
