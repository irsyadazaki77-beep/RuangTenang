import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const e2eArtifactsDir = process.env.E2E_ARTIFACTS_DIR || 'test-artifacts/fase25.5';
process.env.E2E_ARTIFACTS_DIR = e2eArtifactsDir;

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'node scripts/prismaGenerate.js && tsx server.ts',
    url: process.env.PORT ? `http://localhost:${process.env.PORT}/api/health` : 'http://localhost:3000/api/health',
    env: {
      NODE_ENV: 'test',
      E2E_RELAX_AI_LIMITS: '1',
      E2E_MOCK_AI: '1',
      E2E_ARTIFACTS_DIR: e2eArtifactsDir,
      PORT: process.env.PORT || '3000',
      GEMINI_API_KEY: 'e2e-mock-gemini-key',
      DEEPSEEK_API_KEY: '',
      GROQ_API_KEY: '',
      OPENROUTER_API_KEY: '',
    },
    reuseExistingServer: !process.env.CI,
    timeout: Number(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS) || 90000,
  },
});
