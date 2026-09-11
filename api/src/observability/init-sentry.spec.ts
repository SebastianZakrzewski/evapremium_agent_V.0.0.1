import { initSentry } from './init-sentry';

describe('initSentry', () => {
  it('does not initialize when SENTRY_DSN is missing', () => {
    const init = jest.fn();
    expect(initSentry({}, init)).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('initializes the Node SDK from SENTRY_DSN', () => {
    const init = jest.fn();
    expect(initSentry({ SENTRY_DSN: 'https://public@o0.ingest.sentry.io/1' }, init)).toBe(
      true,
    );
    expect(init).toHaveBeenCalledWith({
      dsn: 'https://public@o0.ingest.sentry.io/1',
    });
  });
});
