import { defineConfig } from '@playwright/test';
import process from 'node:process';

// Verified in pinned Playwright 1.64.1: suppress its automatic ARIA error snapshots.
// Recheck this switch before upgrading the runner or using private footage.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 360_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  // Even failed tests must not persist frames or page snapshots of private media.
  preserveOutput: 'never',
  use: {
    browserName: 'chromium',
    channel: 'msedge',
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
