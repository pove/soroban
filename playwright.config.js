import { defineConfig } from '@playwright/test';

const LEGACY_PORT = 4180;
const APP_PORT = 4181;

// CI (or E2E_BUILD=1) tests the production bundle; locally the dev server is faster to start.
const useBuild = Boolean(process.env.CI || process.env.E2E_BUILD);

// The same specs run against the frozen original code ("legacy") and the refactored app ("app").
// That is what proves the refactor did not change observable behavior.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    channel: process.env.CI ? undefined : 'chrome',
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'legacy',
      testMatch: /(game|cards).spec.js$/,
      use: {
        baseURL: `http://localhost:${LEGACY_PORT}`,
        gamePath: '/index.html',
        cardsPath: '/game/index.html',
        stubCdnConfetti: true,
        selectorSet: 'legacy',
      },
    },
    {
      name: 'app',
      use: {
        baseURL: `http://localhost:${APP_PORT}`,
        gamePath: '/index.html',
        cardsPath: '/cards/index.html',
      },
    },
  ],
  webServer: [
    {
      command: `node scripts/static-server.mjs legacy ${LEGACY_PORT}`,
      port: LEGACY_PORT,
      reuseExistingServer: true,
    },
    {
      command: useBuild
        ? `npx vite build && npx vite preview --port ${APP_PORT} --strictPort`
        : `npx vite --port ${APP_PORT} --strictPort`,
      port: APP_PORT,
      reuseExistingServer: true,
    },
  ],
});
