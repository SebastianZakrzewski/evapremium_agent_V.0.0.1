import { posix } from 'node:path';

export const DEFAULT_MASTRA_OBSERVABILITY_PATH = '.mastra/observability.duckdb';

function stripFilePrefix(path: string): string {
  return path.startsWith('file:') ? path.slice('file:'.length) : path;
}

function libsqlFilePath(storageUrl: string): string | undefined {
  if (!storageUrl.startsWith('file:') || storageUrl === 'file::memory:') {
    return undefined;
  }
  const filePath = storageUrl.slice('file:'.length);
  if (filePath === ':memory:' || filePath.length === 0) {
    return undefined;
  }
  return filePath;
}

export function resolveMastraObservabilityPath(options: {
  storageUrl: string;
  observabilityPath?: string;
  env?: Record<string, string | undefined>;
}): string {
  const override =
    options.observabilityPath?.trim() ||
    options.env?.MASTRA_OBSERVABILITY_PATH?.trim();
  if (override) {
    return stripFilePrefix(override);
  }
  const libsql = libsqlFilePath(options.storageUrl);
  if (!libsql) {
    return DEFAULT_MASTRA_OBSERVABILITY_PATH;
  }
  const dir = posix.dirname(libsql.replaceAll('\\', '/'));
  return posix.join(dir, 'observability.duckdb');
}
