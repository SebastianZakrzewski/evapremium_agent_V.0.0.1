export function dashboardBearerOk(
  authorization: string | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const token = env.DASHBOARD_TOKEN?.trim();
  const studio = env.MASTRA_STUDIO_TOKEN?.trim();
  if (!token) {
    return false;
  }
  if (studio && token === studio) {
    return false;
  }
  return authorization === `Bearer ${token}`;
}
