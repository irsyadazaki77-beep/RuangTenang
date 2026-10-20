import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /artifactDiffPerformance\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4189'
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4189 --strictPort',
    url: 'http://127.0.0.1:4189/e2e/artifact-diff-performance.html',
    timeout: 60_000
  }
});
