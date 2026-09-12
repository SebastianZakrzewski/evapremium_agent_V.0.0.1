export const SENTRY_DEBUG_ERROR_MESSAGE = 'EVA Sentry probe';

export function sentryDebugProbeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.SENTRY_DEBUG_PROBE === '1';
}

export function sentryDebugError(): Error {
  return new Error(SENTRY_DEBUG_ERROR_MESSAGE);
}
