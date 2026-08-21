import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

/**
 * Deployed under a subpath on GitHub Pages (/gains/), served from the root
 * everywhere else. Set BASE_PATH at build time; dev and preview stay at '/'.
 */
const base = process.env.BASE_PATH ?? '/'

/**
 * GitHub Pages has no SPA rewrite, so a hard refresh on /gains/library would
 * 404. Pages serves 404.html for unknown paths, and since that is the app shell
 * the router picks the path back up. Only matters on a first visit — once the
 * service worker is installed it handles navigation itself.
 */
const spaFallback = (): Plugin => ({
  name: 'spa-fallback-404',
  apply: 'build',
  async closeBundle() {
    await copyFile('dist/index.html', 'dist/404.html')
  },
})

export default defineConfig({
  base,
  plugins: [
    react(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Gains',
        short_name: 'Gains',
        description: 'Log a set in one tap.',
        theme_color: '#0B0B0C',
        background_color: '#0B0B0C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell is precached. Exercise frames are far too numerous to precache,
        // so they are cached on first view and kept for a year.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/ex/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/ex\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-frames',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
