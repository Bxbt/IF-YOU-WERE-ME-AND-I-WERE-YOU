import { defineConfig, devices } from '@playwright/test';

/** E2E + a11y (docs/11 §1 viewports). Runs against the production build. */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Long play-through tests on CI WebKit (Linux) need more than the 30 s default.
  timeout: process.env.CI ? 120_000 : 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run build && npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: !process.env.CI },
    // Phase 3C relay serving the same dist/ (in-memory store) for the two-device live test.
    {
      command: 'node server/index.mjs',
      url: 'http://localhost:4174/api/live/health',
      env: { PORT: '4174' },
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
    { name: 'tablet', use: { browserName: 'webkit', viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    { name: 'landscape', use: { browserName: 'webkit', viewport: { width: 812, height: 375 } } },
  ],
});
