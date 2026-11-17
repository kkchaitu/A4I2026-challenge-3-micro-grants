import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const createProxyConfig = (target) => ({
  target,
  changeOrigin: true,
  secure: false,
  configure: (proxy) => {
    proxy.on('error', (err, _req, res) => {
      if (res && !res.headersSent && typeof res.writeHead === 'function') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Agent backend not reachable', detail: err.message }));
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': createProxyConfig('http://127.0.0.1:8000'),
      '/run': createProxyConfig('http://127.0.0.1:8000'),
      '/health': createProxyConfig('http://127.0.0.1:8000'),
    },
  },
});
