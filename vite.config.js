import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Relative asset URLs: the same build works on a GitHub Pages project site (/repo/),
  // on a custom domain and when opened from any other folder.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    rollupOptions: {
      input: {
        game: fromRoot('index.html'),
        cards: fromRoot('cards/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
  },
});
