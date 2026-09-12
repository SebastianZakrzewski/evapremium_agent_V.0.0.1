import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataStore } from './data-store';

const PAGE = 1000;

export class SupabaseDataStore implements DataStore {
  constructor(private readonly client: SupabaseClient) {}

  async selectAll<T>(schema: string, table: string): Promise<T[]> {
    const rows: T[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await this.client
        .schema(schema)
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1);
      if (error) {
        throw new Error(`${schema}.${table}: ${error.message}`);
      }
      const page = (data ?? []) as T[];
      rows.push(...page);
      if (page.length < PAGE) {
        return rows;
      }
      from += PAGE;
    }
  }

  async selectEq<T>(
    schema: string,
    table: string,
    column: string,
    value: string,
  ): Promise<T[]> {
    const { data, error } = await this.client
      .schema(schema)
      .from(table)
      .select('*')
      .eq(column, value);
    if (error) {
      throw new Error(`${schema}.${table}: ${error.message}`);
    }
    return (data ?? []) as T[];
  }

  async insert(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.client
      .schema(schema)
      .from(table)
      .insert(row)
      .select()
      .single();
    if (error || !data) {
      throw new Error(`${schema}.${table}: ${error?.message ?? 'insert failed'}`);
    }
    return data as Record<string, unknown>;
  }
}

export function createSupabaseDataStore(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseDataStore {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing supabase env');
  }
  return new SupabaseDataStore(createClient(url, key));
}
