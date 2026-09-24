import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const proxyTarget =
    env.DASHBOARD_API_PROXY?.trim() || 'http://127.0.0.1:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@dashboard': path.resolve(root, 'src'),
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/v1': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setup.ts',
      include: ['../tests/dashboard/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
