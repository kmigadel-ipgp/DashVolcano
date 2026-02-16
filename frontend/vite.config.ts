import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'buffer': path.resolve(__dirname, './src/polyfills/buffer.js'),
      'buffer/': path.resolve(__dirname, './src/polyfills/buffer.js'),
    },
  },
  server: {
    // allow Vite to be accessed externally and accept this host
    host: true,
    port: 5173,
    // allow specific hostnames (prevents "Blocked request" errors)
    allowedHosts: ['dashvolcano.ipgp.fr'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'deck-gl': ['deck.gl', '@deck.gl/react', '@deck.gl/layers', '@deck.gl/geo-layers'],
          'plotly': ['plotly.js', 'react-plotly.js'],
        },
      },
    },
  },
})
