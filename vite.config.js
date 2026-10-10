import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

/** Short hash of the commit being built, shown next to the version (empty outside git). */
function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  // Relative asset URLs: the same build works on a GitHub Pages project site (/repo/),
  // and when opened from any other folder.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(gitCommit()),
  },
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
