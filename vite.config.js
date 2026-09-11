import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/*
 * GitHub Pages serves a project repo from a subpath — /AisleLedger/ — not the
 * domain root, so every asset URL, the manifest scope and the router basename
 * have to agree on it. Override for any other host:
 *
 *   BASE_PATH=/ npm run build
 */
const base = process.env.BASE_PATH ?? '/AisleLedger/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // autoUpdate, not prompt: a prompt only applies when someone taps a
      // toast, so a phone that misses it stays on an old build forever. Every
      // edit is already autosaved to IndexedDB within ~500ms, so swapping the
      // app out from under the user costs nothing.
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: [
        'favicon.svg',
        'sw-notifications.js',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-192.png',
        'icons/maskable-512.png',
      ],
      manifest: {
        name: 'Aisle Ledger',
        short_name: 'Aisle Ledger',
        description: 'A private, offline wedding budget planner that lives on your device.',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#7C8B72',
        background_color: '#F7F5EF',
        categories: ['finance', 'lifestyle', 'productivity'],
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell so the app boots with no network at all.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: `${base}index.html`,
        // Adds the notificationclick handler to the generated worker.
        importScripts: [`${base}sw-notifications.js`],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  server: { host: true },
})
