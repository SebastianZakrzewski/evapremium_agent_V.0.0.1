import assert from 'node:assert/strict';
import { leafIngestEnabled } from '../../../api/scripts/ingest-context-leaves.mjs';
import test from 'node:test';

test('skips ingest without OpenAI and DATABASE_URL', () => {
  assert.equal(leafIngestEnabled({}), false);
  assert.equal(
    leafIngestEnabled({
      OPENAI_API_KEY: 'sk-test',
      DATABASE_URL: 'postgres://local',
    }),
    true,
  );
});
