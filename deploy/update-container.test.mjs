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
  assert.doesNotMatch(script, /password|SERVICE_ROLE|DEEPSEEK|BITRIX/i);
});
