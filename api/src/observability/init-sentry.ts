import * as Sentry from '@sentry/node';

export function initSentry(
  env: NodeJS.ProcessEnv = process.env,
  init: typeof Sentry.init = Sentry.init.bind(Sentry),
): boolean {
  const dsn = env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }
  init({ dsn });
  return true;
}
