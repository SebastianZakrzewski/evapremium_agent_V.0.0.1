export const MASTRA_HTTP_PREFIX = '/mastra';

export function shouldMountMastraHttp(
  env: Record<string, string | undefined>,
): boolean {
  return Boolean(
    env.DEEPSEEK_API_KEY?.trim() && env.MASTRA_STUDIO_TOKEN?.trim(),
  );
}

const LOCAL_STUDIO_ORIGINS = [
  'http://localhost:4111',
  'http://localhost:3000',
  'http://127.0.0.1:4111',
  'http://127.0.0.1:3000',
] as const;

function extraStudioOrigin(raw?: string): string | undefined {
  const extra = raw?.trim().replace(/\/$/, '');
  if (!extra) {
    return undefined;
  }
  try {
    const url = new URL(extra);
    const local =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (local && (url.protocol === 'http:' || url.protocol === 'https:')) {
      return extra;
    }
    if (url.protocol === 'https:') {
      return extra;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function mastraStudioCorsOrigins(options: {
  httpEnabled: boolean;
  extraOrigin?: string;
}): string[] {
  if (!options.httpEnabled) {
    return [];
  }
  const origins: string[] = [...LOCAL_STUDIO_ORIGINS];
  const extra = extraStudioOrigin(options.extraOrigin);
  if (extra && !origins.includes(extra)) {
    origins.push(extra);
  }
  return origins;
}
