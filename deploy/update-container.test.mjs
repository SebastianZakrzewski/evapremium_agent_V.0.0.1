import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'update-container.sh'),
  'utf8',
);

test('rebuilds the named image from the clone root and keeps secrets in env-file', () => {
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /docker build -t "\$IMAGE" "\$ROOT"/);
  assert.match(script, /\/opt\/evabot\/api\/\.env/);
  assert.match(script, /--env-file "\$ENV_FILE"/);
  assert.match(script, /-p 3000:3000/);
  assert.match(script, /\/v1\/health/);
  assert.match(script, /seq 1 30/);
  assert.doesNotMatch(script, /password|SERVICE_ROLE|DEEPSEEK|BITRIX/i);
});

test('persists Mastra LibSQL on a host volume without embedding secrets', () => {
  assert.match(script, /\/opt\/evabot\/mastra/);
  assert.match(script, /-v "\$DATA_DIR:\/data"/);
  assert.match(script, /-e MASTRA_STORAGE_URL=file:\/data\/mastra\.db/);
  assert.match(
    script,
    /-e MASTRA_OBSERVABILITY_PATH=\/data\/observability\.duckdb/,
  );
  assert.doesNotMatch(script, /MASTRA_STUDIO_TOKEN/);
});

test('runs Studio as a second image on 4111 without embedding secrets', () => {
  assert.match(script, /Dockerfile\.studio/);
  assert.match(script, /evabot-studio:git/);
  assert.match(script, /-p 4111:4111/);
  assert.match(script, /host-gateway/);
  assert.match(script, /MASTRA_STUDIO_PUBLIC_PORT=4111/);
  assert.doesNotMatch(script, /MASTRA_STUDIO_TOKEN/);
});
