import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com https://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com https://*.firebasestorage.app wss://*.firebaseio.com wss://*.firebasestorage.app; frame-src https://www.google.com https://www.gstatic.com; upgrade-insecure-requests"
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    headers: securityHeaders
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/app-check'],
          'vendor-datepicker': ['react-datepicker', 'date-fns'],
          'vendor-motion': ['motion', 'motion/react', 'motion/react-m']
        }
      }
    }
  },
})
