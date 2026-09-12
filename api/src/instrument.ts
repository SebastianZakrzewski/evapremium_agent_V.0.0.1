import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initSentry } from './observability/init-sentry';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

initSentry();
