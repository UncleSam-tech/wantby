import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'WantBy — What you want, by when',
        short_name: 'WantBy',
        description: 'A private, offline list for what you want to get and when you need it.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f5f1e8',
        theme_color: '#1d6b52',
        categories: ['shopping', 'productivity', 'utilities'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Add something', short_name: 'Add', url: '/?capture=1', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Due today', short_name: 'Today', url: '/?view=today', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
})
