import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@widget': path.resolve(root, 'src'),
      '@widget-root': root,
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setup.ts',
    include: ['../tests/widget/**/*.{test,spec}.{ts,tsx}'],
  },
});
