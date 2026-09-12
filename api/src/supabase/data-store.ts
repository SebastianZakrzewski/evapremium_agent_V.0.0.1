export type DataStore = {
  selectAll<T>(schema: string, table: string): Promise<T[]>;
  selectEq<T>(
    schema: string,
    table: string,
    column: string,
    value: string,
  ): Promise<T[]>;
  insert(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
};

export function tableKey(schema: string, table: string): string {
  return `${schema}.${table}`;
}

export class MemoryDataStore implements DataStore {
  constructor(private readonly tables: Record<string, Record<string, unknown>[]> = {}) {}

  async selectAll<T>(schema: string, table: string): Promise<T[]> {
    return [...(this.tables[tableKey(schema, table)] ?? [])] as T[];
  }

  async selectEq<T>(
    schema: string,
    table: string,
    column: string,
    value: string,
  ): Promise<T[]> {
    const rows = await this.selectAll<Record<string, unknown>>(schema, table);
    return rows.filter((row) => String(row[column]) === value) as T[];
  }

  async insert(
    schema: string,
    table: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const key = tableKey(schema, table);
    const stored: Record<string, unknown> = { ...row };
    if (typeof stored.id !== 'string' || stored.id === '') {
      stored.id = crypto.randomUUID();
    }
    this.tables[key] = [...(this.tables[key] ?? []), stored];
    return stored;
  }
}
