import { validateEnvironment } from './envValidation.js';
import { parsePort } from './port.js';
import { isAiAvailable } from './aiConfig.js';
import { aiProviderConfig } from './aiProviderConfig.js';

// ==========================================
// ENVIRONMENT VALIDATION ON STARTUP
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
  const port = parsePort(process.env.PORT, 3000).toString();
  const jwtSecret = process.env.JWT_SECRET;
  const aiProviderConfigured = isAiAvailable();
  if (!aiProviderConfigured) {
    warnings.push('Tidak ada API key provider AI yang terkonfigurasi. Fitur obrolan akan menggunakan panduan reflektif lokal.');
  }

  console.log(`==========================================`);
  console.log(`[STARTUP ENV VALIDATION] Status Environment`);
  console.log(`- NODE_ENV        : ${env}`);
  console.log(`- PORT            : ${port}`);
  console.log(`- JWT_SECRET      : ${jwtSecret ? 'TERSEDIA' : 'NOT SET'}`);
  console.log(`- AI PROVIDER     : ${aiProviderConfigured ? 'TERSEDIA' : 'TIDAK ADA (FALLBACK COMPANION)'}`);
  console.log(`- OPENAI_API_KEY  : ${aiProviderConfig.isConfigured('openai') ? 'TERSEDIA' : 'TIDAK ADA'}`);
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
      AI_PROVIDER_CONFIGURED: aiProviderConfigured ? 'true' : 'false',
      OPENAI_API_KEY_SET: aiProviderConfig.isConfigured('openai') ? 'true' : 'false'
    }
  };
}
