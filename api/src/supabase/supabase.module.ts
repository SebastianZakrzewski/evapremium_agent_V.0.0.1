import { Module } from '@nestjs/common';
import type { DataStore } from './data-store';
import { hasSupabaseEnv } from './env';
import { createSupabaseDataStore } from './supabase-data-store';

export const DATA_STORE = Symbol('DATA_STORE');

@Module({
  providers: [
    {
      provide: DATA_STORE,
      useFactory: (): DataStore | undefined =>
        hasSupabaseEnv() ? createSupabaseDataStore() : undefined,
    },
  ],
  exports: [DATA_STORE],
})
export class SupabaseModule {}
