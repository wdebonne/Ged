import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Expose sur le réseau (0.0.0.0)
    open: false, // Ne pas ouvrir automatiquement le navigateur
    watch: {
      usePolling: true // Required for Docker on Windows (inotify not reliable)
    },
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-pdf': ['jspdf', 'html2canvas', 'react-pdf'],
          'vendor-forms': ['react-select', 'react-datepicker', 'react-dropzone'],
          'vendor-misc': ['axios', 'date-fns', 'zustand', 'react-hot-toast'],
        }
      }
    }
  }
})
