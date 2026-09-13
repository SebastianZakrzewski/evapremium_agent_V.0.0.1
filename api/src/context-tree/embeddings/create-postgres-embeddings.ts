import { Pool } from 'pg';
import {
  PostgresContextLeafEmbeddings,
  type SqlQuery,
} from './postgres-embeddings';

export function createPostgresQuery(connectionString: string): SqlQuery {
  const pool = new Pool({ connectionString });
  return async (sql, params) => {
    const result = await pool.query(sql, params);
    return { rows: result.rows as Record<string, unknown>[] };
  };
}

export function createPostgresContextLeafEmbeddings(connectionString: string) {
  return new PostgresContextLeafEmbeddings(createPostgresQuery(connectionString));
}
