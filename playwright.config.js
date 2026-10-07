import { defineConfig } from '@playwright/test';

const LEGACY_PORT = 4180;
const APP_PORT = 4181;

// The same specs run against the frozen original code ("legacy") and the refactored app ("app").
// That is what proves the refactor did not change observable behavior.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { channel: 'chrome', locale: 'es-ES', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'legacy',
      use: {
        baseURL: `http://localhost:${LEGACY_PORT}`,
        gamePath: '/index.html',
        cardsPath: '/game/index.html',
        stubCdnConfetti: true,
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
      command: `npx vite --port ${APP_PORT} --strictPort`,
      port: APP_PORT,
      reuseExistingServer: true,
    },
  ],
});
