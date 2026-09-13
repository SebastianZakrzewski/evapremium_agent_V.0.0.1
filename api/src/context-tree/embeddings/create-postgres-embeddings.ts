import { Pool } from 'pg';
import {
  PostgresContextLeafEmbeddings,
  type SqlQuery,
} from './postgres-embeddings';

export function createPostgresQuery(connectionString: string): SqlQuery {
  return createPostgresEmbeddingsSession(connectionString).query;
}

export function createPostgresEmbeddingsSession(connectionString: string): {
  store: PostgresContextLeafEmbeddings;
  query: SqlQuery;
  end: () => Promise<void>;
} {
  const pool = new Pool({ connectionString });
  const query: SqlQuery = async (sql, params) => {
    const result = await pool.query(sql, params);
    return { rows: result.rows as Record<string, unknown>[] };
  };
  return {
    store: new PostgresContextLeafEmbeddings(query),
    query,
    end: () => pool.end(),
  };
}

export function createPostgresContextLeafEmbeddings(connectionString: string) {
  return new PostgresContextLeafEmbeddings(createPostgresQuery(connectionString));
}
