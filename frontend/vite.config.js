import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Expose sur le réseau (0.0.0.0)
    open: false, // Ne pas ouvrir automatiquement le navigateur
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
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
