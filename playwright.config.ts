import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: 'list',
  use: {
    actionTimeout: 30000,
    baseURL: 'http://localhost:4200',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env['E2E_CHROMIUM'],
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--no-sandbox',
      ],
    },
  },
  webServer: [
    {
      command: 'node ../backend/tests/integration/browser-server.mjs',
      url: 'http://localhost:20880/q/health/ready',
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command: 'node tests/e2e/serve.mjs',
      url: 'http://localhost:4200',
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
});
