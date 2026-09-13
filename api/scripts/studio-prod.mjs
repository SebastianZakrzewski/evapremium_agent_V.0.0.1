import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export function tokenFromEnvFile(text) {
  const line = text.split(/\r?\n/).find((row) => row.startsWith('MASTRA_STUDIO_TOKEN='));
  if (!line) {
    return '';
  }
  return line.slice('MASTRA_STUDIO_TOKEN='.length).trim().replace(/^['"]|['"]$/g, '');
}

export function resolveStudioToken(env, envFileText) {
  return env.MASTRA_STUDIO_TOKEN?.trim() || tokenFromEnvFile(envFileText);
}

export function studioArgv(presetsPath) {
  return [
    '--yes',
    'mastra@latest',
    'studio',
    '--port',
    '4111',
    '--server-host',
    'localhost',
    '--server-port',
    '3000',
    '--server-protocol',
    'http',
    '--server-api-prefix',
    '/mastra',
    '--request-context-presets',
    presetsPath,
  ];
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function openStudioWithBearer(token) {
  const url = `http://localhost:4111/?auth_header=${encodeURIComponent(`Bearer ${token}`)}`;
  const opener =
    process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' })
      : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {
          detached: true,
          stdio: 'ignore',
        });
  opener.unref();
}

function main() {
  const envPath = join(apiRoot, '.env');
  const envFileText = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const token = resolveStudioToken(process.env, envFileText);
  if (!token) {
    console.error(
      'Brak MASTRA_STUDIO_TOKEN (środowisko albo api/.env). Najpierw tunel: ssh -L 3000:127.0.0.1:3000 …',
    );
    process.exit(1);
  }
  const presetsPath = join(apiRoot, 'mastra-request-context-presets.json');
  const child = spawn(npxCommand(), studioArgv(presetsPath), {
    cwd: apiRoot,
    stdio: 'inherit',
  });
  child.on('spawn', () => {
    console.error(
      'Studio: http://localhost:4111 — tunel musi trzymać Nest na :3000. Bearer idzie w query auth_header (nie logowany).',
    );
    setTimeout(() => openStudioWithBearer(token), 2500);
  });
  child.on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
