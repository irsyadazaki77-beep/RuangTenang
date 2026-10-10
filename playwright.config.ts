import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

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
      GEMINI_API_KEY: '',
      DEEPSEEK_API_KEY: '',
      GROQ_API_KEY: '',
      OPENROUTER_API_KEY: '',
    },
    reuseExistingServer: true,
    timeout: 30000,
  },
});
