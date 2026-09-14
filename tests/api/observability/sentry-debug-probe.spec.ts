import {
  sentryDebugError,
  sentryDebugProbeEnabled,
  SENTRY_DEBUG_ERROR_MESSAGE,
} from '@api/observability/sentry-debug-probe';

describe('sentry debug probe', () => {
  it('is off unless SENTRY_DEBUG_PROBE=1', () => {
    expect(sentryDebugProbeEnabled({})).toBe(false);
    expect(sentryDebugProbeEnabled({ SENTRY_DEBUG_PROBE: '1' })).toBe(true);
  });

  it('builds an unexpected Error for Sentry (not an HTTP exception)', () => {
    const error = sentryDebugError();
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(SENTRY_DEBUG_ERROR_MESSAGE);
    expect(error).not.toHaveProperty('getStatus');
  });
});
