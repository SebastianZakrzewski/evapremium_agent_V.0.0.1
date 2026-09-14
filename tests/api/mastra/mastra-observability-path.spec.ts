import {
  DEFAULT_MASTRA_OBSERVABILITY_PATH,
  resolveMastraObservabilityPath,
} from '@api/mastra/mastra-observability-path';

describe('Mastra observability file path', () => {
  it('puts DuckDB next to the LibSQL file', () => {
    expect(
      resolveMastraObservabilityPath({
        storageUrl: 'file:/data/mastra.db',
      }),
    ).toBe('/data/observability.duckdb');
    expect(
      resolveMastraObservabilityPath({
        storageUrl: 'file:.mastra/editor.db',
      }),
    ).toBe('.mastra/observability.duckdb');
    expect(DEFAULT_MASTRA_OBSERVABILITY_PATH).toBe(
      '.mastra/observability.duckdb',
    );
  });

  it('uses MASTRA_OBSERVABILITY_PATH and strips a file: prefix', () => {
    expect(
      resolveMastraObservabilityPath({
        storageUrl: 'file:/data/mastra.db',
        env: { MASTRA_OBSERVABILITY_PATH: '/data/custom.duckdb' },
      }),
    ).toBe('/data/custom.duckdb');
    expect(
      resolveMastraObservabilityPath({
        storageUrl: 'file:/data/mastra.db',
        observabilityPath: 'file:/tmp/obs.duckdb',
      }),
    ).toBe('/tmp/obs.duckdb');
  });

  it('falls back when LibSQL is in-memory', () => {
    expect(
      resolveMastraObservabilityPath({ storageUrl: 'file::memory:' }),
    ).toBe(DEFAULT_MASTRA_OBSERVABILITY_PATH);
  });
});
