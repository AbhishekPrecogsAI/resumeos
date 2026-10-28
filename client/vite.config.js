import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:5000';

// The shared package lives outside the client root. Watch it explicitly so edits to templates,
// rules or validation always reload in dev instead of serving stale cached modules.
const sharedSrc = fileURLToPath(new URL('../shared/src', import.meta.url));
const watchShared = {
  name: 'resumeos-watch-shared',
  configureServer(server) {
    server.watcher.add(sharedSrc);
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), watchShared],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/health': apiTarget,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    testTimeout: 15_000,
  },
});
