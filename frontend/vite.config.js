import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs';

const isDev = process.env.NODE_ENV !== 'production';

// Only load SSL certs in local dev if they exist
const httpsConfig = (() => {
  if (!isDev) return undefined;
  try {
    return {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    };
  } catch {
    return undefined; // certs not present, run without HTTPS
  }
})();

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    strictPort: true,
    ...(httpsConfig && { https: httpsConfig }),
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
});
