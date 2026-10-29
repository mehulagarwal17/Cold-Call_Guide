import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/health': {
          target: 'https://cold-call-guide-s90e.onrender.com',
          changeOrigin: true,
          secure: true,
        },
        '/stages': {
          target: 'https://cold-call-guide-s90e.onrender.com',
          changeOrigin: true,
          secure: true,
        },
        '/calls': {
          target: 'https://cold-call-guide-s90e.onrender.com',
          changeOrigin: true,
          secure: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
              return '/index.html';
            }
          },
        },
      },
    },
  };
});
