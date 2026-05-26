import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const standaloneFile = path
  .resolve(__dirname, 'standalone.html')
  .replace(/\\/g, '/');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 10_000,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['github'],   // annotates PR checks with inline test failures
  ],
  use: {
    baseURL: `file:///${standaloneFile}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
});
