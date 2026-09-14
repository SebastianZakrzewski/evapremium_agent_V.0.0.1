import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const caddy = readFileSync(join(root, 'deploy/studio/Caddyfile'), 'utf8');
const start = readFileSync(join(root, 'deploy/studio/start.sh'), 'utf8');
const dockerfile = readFileSync(join(root, 'Dockerfile.studio'), 'utf8');

test('Studio Caddy same-origin proxies /mastra to host API with injected Bearer', () => {
  assert.match(caddy, /handle \/mastra\*/);
  assert.match(caddy, /host\.docker\.internal:3000/);
  assert.match(caddy, /header_up Authorization "Bearer \{\$MASTRA_STUDIO_TOKEN\}"/);
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:4112/);
  assert.match(caddy, /basic_auth/);
  assert.doesNotMatch(caddy, /password|SERVICE_ROLE|DEEPSEEK|BITRIX/i);
});

test('Studio start binds UI internally and tells the browser public host:4111', () => {
  assert.match(start, /mastra studio/);
  assert.match(start, /--port 4112/);
  assert.match(start, /--server-port "\$PORT"/);
  assert.match(start, /--server-api-prefix \/mastra/);
  assert.match(start, /caddy hash-password/);
  assert.match(start, /--config \/tmp\/Caddyfile/);
  assert.doesNotMatch(start, /46\.224\.75\.64/);
});

test('Studio image pins Mastra CLI and copies presets', () => {
  assert.match(dockerfile, /mastra@1\.29\.0/);
  assert.match(dockerfile, /mastra-request-context-presets\.json/);
  assert.match(dockerfile, /EXPOSE 4111/);
});
