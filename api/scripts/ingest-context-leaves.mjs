import { fileURLToPath } from 'node:url';

export function leafIngestEnabled(env = process.env) {
  return Boolean(env.OPENAI_API_KEY?.trim() && env.DATABASE_URL?.trim());
}

async function main() {
  if (!leafIngestEnabled(process.env)) {
    console.error(
      'skip: set OPENAI_API_KEY and DATABASE_URL to ingest context leaf embeddings',
    );
    process.exit(0);
  }
  const { runLeafIngest } = await import(
    '../dist/context-tree/embeddings/run-ingest.js'
  );
  const result = await runLeafIngest(process.env);
  if (result.skipped) {
    console.error('skip: ingest disabled');
    process.exit(0);
  }
  console.log(`ingested ${result.written} leaves`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
