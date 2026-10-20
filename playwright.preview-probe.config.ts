import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /workspacePreviewPerformance\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4190'
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4190 --strictPort',
    url: 'http://127.0.0.1:4190/e2e/workspace-preview-performance.html',
    timeout: 60_000
  }
});
