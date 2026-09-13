export const UPSERT_CONTEXT_EMBEDDING_SQL = `
insert into eva_bot.context_node_embeddings (slug, chunk, embedding, updated_at)
values ($1, $2, $3::vector, now())
on conflict (slug) do update
set chunk = excluded.chunk,
    embedding = excluded.embedding,
    updated_at = now()
`.trim();

export const LIST_CONTEXT_EMBEDDING_SQL = `
select slug, embedding::text as embedding
from eva_bot.context_node_embeddings
`.trim();

export function vectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export function parseVectorText(value: string): number[] {
  return value
    .replace(/^[[(]/, '')
    .replace(/[\])]$/, '')
    .split(',')
    .map((part) => Number(part.trim()));
}

export type SqlQuery = (
  sql: string,
  params: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export class PostgresContextLeafEmbeddings {
  constructor(private readonly query: SqlQuery) {}

  async upsert(row: {
    slug: string;
    chunk: string;
    embedding: number[];
  }): Promise<void> {
    await this.query(UPSERT_CONTEXT_EMBEDDING_SQL, [
      row.slug,
      row.chunk,
      vectorLiteral(row.embedding),
    ]);
  }

  async list(): Promise<{ slug: string; vector: number[] }[]> {
    const result = await this.query(LIST_CONTEXT_EMBEDDING_SQL, []);
    return result.rows.map((row) => ({
      slug: String(row.slug),
      vector: parseVectorText(String(row.embedding)),
    }));
  }
}
