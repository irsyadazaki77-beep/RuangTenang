import express from 'express';

const router = express.Router();

router.post('/log-error', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.log('--- CLIENT ERROR LOG ---');
  if (isProd) {
    // Redact sensitive payload in production
    const safeBody = {
      ...req.body,
      message: req.body?.message || 'Error occurred',
      stack: '[REDACTED]',
      data: '[REDACTED]'
    };
    console.log(JSON.stringify(safeBody, null, 2));
  } else {
    console.log(JSON.stringify(req.body, null, 2));
  }
  console.log('------------------------');
  res.status(200).send('Logged');
});

export default router;
