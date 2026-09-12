export function hasSupabaseEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
