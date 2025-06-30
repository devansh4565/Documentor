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
});
