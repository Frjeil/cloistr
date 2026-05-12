import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vitest/config'

function manualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  if (id.includes('@mantine') || id.includes('@tabler')) {
    return 'mantine-vendor'
  }

  if (id.includes('i18next')) {
    return 'i18n-vendor'
  }

  if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('/zod/')) {
    return 'forms-vendor'
  }

  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
    },
  },
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    port: Number(process.env.VITE_PORT || 5176),
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
