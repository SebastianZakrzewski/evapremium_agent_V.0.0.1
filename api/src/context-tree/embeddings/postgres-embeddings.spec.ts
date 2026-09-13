import {
  LIST_CONTEXT_EMBEDDING_SQL,
  PostgresContextLeafEmbeddings,
  UPSERT_CONTEXT_EMBEDDING_SQL,
  parseVectorText,
  vectorLiteral,
} from './postgres-embeddings';

describe('postgres context embeddings adapter', () => {
  it('maps eva_bot.context_node_embeddings onto the lookup contract', async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const adapter = new PostgresContextLeafEmbeddings(async (sql, params) => {
      calls.push({ sql, params });
      if (sql === LIST_CONTEXT_EMBEDDING_SQL) {
        return {
          rows: [{ slug: 'dostawa', embedding: vectorLiteral([1, 0, 0]) }],
        };
      }
      return { rows: [] };
    });
    await adapter.upsert({
      slug: 'dostawa',
      chunk: 'Dostawa\nWysyłka',
      embedding: [1, 0, 0],
    });
    expect(calls[0]).toEqual({
      sql: UPSERT_CONTEXT_EMBEDDING_SQL,
      params: ['dostawa', 'Dostawa\nWysyłka', vectorLiteral([1, 0, 0])],
    });
    await expect(adapter.list()).resolves.toEqual([
      { slug: 'dostawa', vector: [1, 0, 0] },
    ]);
    expect(parseVectorText('[1,0,0]')).toEqual([1, 0, 0]);
  });
});
