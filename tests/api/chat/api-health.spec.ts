import { apiHealth, CD_PROBE } from '@api/chat/api-health';

describe('api health probe', () => {
  it('returns ok with the current CD probe token', () => {
    expect(apiHealth()).toEqual({ status: 'ok', probe: CD_PROBE });
  });
});
