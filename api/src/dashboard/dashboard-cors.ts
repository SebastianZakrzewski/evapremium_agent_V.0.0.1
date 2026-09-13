export function dashboardCorsOrigins(raw?: string): string[] {
  const extra = raw?.trim().replace(/\/$/, '');
  if (!extra) {
    return [];
  }
  try {
    const url = new URL(extra);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol === 'https:') {
      return [extra];
    }
    if (local && url.protocol === 'http:') {
      return [extra];
    }
  } catch {
    return [];
  }
  return [];
}

export function dashboardAllowOrigin(
  requestOrigin: string | undefined,
  dashboardOrigin?: string,
): string | undefined {
  if (!requestOrigin) {
    return undefined;
  }
  return dashboardCorsOrigins(dashboardOrigin).includes(requestOrigin)
    ? requestOrigin
    : undefined;
}

export function applyDashboardCors(
  req: {
    path: string;
    method: string;
    headers: { origin?: string | string[] };
  },
  res: {
    header(name: string, value: string): unknown;
    removeHeader?(name: string): unknown;
    status(code: number): { end(): unknown };
  },
  next: () => void,
): void {
  if (!req.path.startsWith('/v1/dashboard')) {
    next();
    return;
  }
  const headerOrigin = req.headers.origin;
  const origin = dashboardAllowOrigin(
    typeof headerOrigin === 'string' ? headerOrigin : undefined,
    process.env.DASHBOARD_ORIGIN,
  );
  res.removeHeader?.('Access-Control-Allow-Origin');
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
