import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    host: "localhost", // or "0.0.0.0" to accept any IP
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost", 
    },
  },
  plugins: [react()],
  base: './',

  // ✅ This is the fix for the 404 on refresh or direct links
  build: {
    rollupOptions: {
      input: './index.html',
    },
  },
  // ✅ Custom dev server middleware for fallback (optional, works locally)
  // For production hosting, rely on _redirects or host-level config
});
