import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * End-to-end tests run under vitest driving the Playwright *library*, not the
 * Playwright test runner. The runner in this image launches Chromium with
 * `--inspector-pipe`, a flag newer than the preinstalled build, so it never
 * connects. The library uses the older pipe flag and drives the same browser fine.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.ts'],
    testTimeout: 60_000,
    hookTimeout: 90_000,
    fileParallelism: false,
  },
})
