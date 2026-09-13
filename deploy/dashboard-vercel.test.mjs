import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('dashboard Vercel config does not rewrite /v1 to Hetzner', () => {
  const json = JSON.parse(
    readFileSync(join(root, 'dashboard/vercel.json'), 'utf8'),
  );
  const blob = JSON.stringify(json);
  assert.equal(blob.includes('46.224.75.64'), false);
  assert.equal(blob.includes('/v1'), false);
});
