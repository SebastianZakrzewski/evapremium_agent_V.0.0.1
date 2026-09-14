import { initSentry } from '@api/observability/init-sentry';

describe('initSentry', () => {
  it('does not initialize when SENTRY_DSN is missing', () => {
    const init = jest.fn();
    expect(initSentry({}, init)).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('initializes the Nest SDK from SENTRY_DSN without user or HTTP body collection', () => {
    const init = jest.fn();
    expect(
      initSentry({ SENTRY_DSN: 'https://public@o0.ingest.sentry.io/1' }, init),
    ).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@o0.ingest.sentry.io/1',
        tracesSampleRate: 0.2,
        dataCollection: {
          userInfo: false,
          httpBodies: [],
        },
      }),
    );
  });

  it('drops health-check transactions', () => {
    const init = jest.fn();
    initSentry({ SENTRY_DSN: 'https://public@o0.ingest.sentry.io/1' }, init);
    const beforeSendTransaction = init.mock.calls[0][0]
      .beforeSendTransaction as (event: { transaction?: string }) => unknown;
    expect(beforeSendTransaction({ transaction: 'GET /v1/health' })).toBeNull();
    expect(beforeSendTransaction({ transaction: 'POST /v1/sessions' })).toEqual({
      transaction: 'POST /v1/sessions',
    });
  });
});
