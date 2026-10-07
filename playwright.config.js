import { defineConfig } from '@playwright/test';

const PORT = 4181;

// CI (or E2E_BUILD=1) tests the production bundle; locally the dev server is faster to start.
const useBuild = Boolean(process.env.CI || process.env.E2E_BUILD);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Locally use the installed Chrome; CI installs Playwright's own Chromium.
    channel: process.env.CI ? undefined : 'chrome',
    // The game's Spanish texts are asserted in most specs.
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: useBuild
      ? `npx vite build && npx vite preview --port ${PORT} --strictPort`
      : `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
