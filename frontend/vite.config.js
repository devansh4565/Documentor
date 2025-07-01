import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0', // Good for deployment
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  // ✅ This is the fix for the 404 on refresh or direct links
  build: {
    sourcemap: true,
    rollupOptions: {
      input: './index.html',
    },
  },
  // ✅ Custom dev server middleware for fallback (optional, works locally)
  // For production hosting, rely on _redirects or host-level config
});
