import { defineConfig } from '@playwright/test';
import process from 'node:process';

// Pinned 1.64.1 supports this switch for automatic ARIA error snapshots.
// Recheck it on runner upgrades. This suite still permits only fixed patterns.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/browser/verify-fixtures.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 360_000,
  globalTimeout: 900_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  preserveOutput: 'never',
  use: {
    browserName: 'chromium',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    baseURL: 'http://127.0.0.1:4179',
    viewport: { width: 1280, height: 800 },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
