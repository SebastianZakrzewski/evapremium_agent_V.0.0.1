import * as Sentry from '@sentry/nestjs';

export function initSentry(
  env: NodeJS.ProcessEnv = process.env,
  init: typeof Sentry.init = Sentry.init.bind(Sentry),
): boolean {
  const dsn = env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }
  init({
    dsn,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    tracesSampleRate: 0.2,
    beforeSendTransaction(event) {
      if (event.transaction === 'GET /v1/health') {
        return null;
      }
      return event;
    },
  });
  return true;
}
