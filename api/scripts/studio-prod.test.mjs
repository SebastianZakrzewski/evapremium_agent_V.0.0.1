import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveStudioToken, studioArgv, tokenFromEnvFile } from './studio-prod.mjs';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const presets = JSON.parse(
  readFileSync(join(apiRoot, 'mastra-request-context-presets.json'), 'utf8'),
);

test('reads token from env file without quotes', () => {
  assert.equal(tokenFromEnvFile('MASTRA_STUDIO_TOKEN=abc\n'), 'abc');
  assert.equal(resolveStudioToken({ MASTRA_STUDIO_TOKEN: ' from-env ' }, ''), 'from-env');
});

test('builds Studio argv for Nest /mastra behind the SSH tunnel', () => {
  const argv = studioArgv('/tmp/presets.json');
  assert.equal(argv[argv.indexOf('--port') + 1], '4111');
  assert.equal(argv[argv.indexOf('--server-host') + 1], 'localhost');
  assert.equal(argv[argv.indexOf('--server-port') + 1], '3000');
  assert.equal(argv[argv.indexOf('--server-protocol') + 1], 'http');
  assert.equal(argv[argv.indexOf('--server-api-prefix') + 1], '/mastra');
  assert.equal(argv[argv.indexOf('--request-context-presets') + 1], '/tmp/presets.json');
  assert.equal(argv.includes('--url'), false);
  assert.equal(argv.includes('--header'), false);
});

test('request-context presets cover every ShopIntent', () => {
  assert.deepEqual(Object.keys(presets).sort(), [
    'after_sales',
    'delivery',
    'out_of_scope',
    'pricing',
    'product_info',
  ]);
  for (const [name, value] of Object.entries(presets)) {
    assert.equal(value.intent, name);
  }
});
