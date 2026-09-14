import {
  MASTRA_HTTP_PREFIX,
  emptyMastraFeedbackList,
  isMastraFeedbackListRequest,
  mastraStudioCorsOrigins,
  shouldMountMastraHttp,
} from '@api/mastra/studio-http';

describe('Mastra Studio HTTP gate', () => {
  it('mounts only when DeepSeek and studio token are both set', () => {
    expect(shouldMountMastraHttp({})).toBe(false);
    expect(
      shouldMountMastraHttp({ DEEPSEEK_API_KEY: 'sk-test' }),
    ).toBe(false);
    expect(
      shouldMountMastraHttp({ MASTRA_STUDIO_TOKEN: 'secret' }),
    ).toBe(false);
    expect(
      shouldMountMastraHttp({
        DEEPSEEK_API_KEY: 'sk-test',
        MASTRA_STUDIO_TOKEN: 'secret',
      }),
    ).toBe(true);
    expect(MASTRA_HTTP_PREFIX).toBe('/mastra');
  });

  it('returns an empty feedback page because LibSQL cannot list feedback', () => {
    expect(isMastraFeedbackListRequest('GET', '/mastra/observability/feedback')).toBe(
      true,
    );
    expect(
      isMastraFeedbackListRequest('POST', '/mastra/observability/feedback'),
    ).toBe(false);
    expect(emptyMastraFeedbackList()).toEqual({
      feedback: [],
      pagination: { total: 0, page: 0, perPage: 10, hasMore: false },
    });
    expect(emptyMastraFeedbackList('delta')).toEqual({ feedback: [] });
  });

  it('adds localhost Studio origins only when HTTP is enabled', () => {
    expect(mastraStudioCorsOrigins({ httpEnabled: false })).toEqual([]);
    expect(mastraStudioCorsOrigins({ httpEnabled: true })).toEqual(
      expect.arrayContaining([
        'http://localhost:4111',
        'http://localhost:3000',
      ]),
    );
  });

  it('accepts extra https Studio origin and rejects public http', () => {
    expect(
      mastraStudioCorsOrigins({
        httpEnabled: true,
        extraOrigin: 'https://studio.example.com/',
      }),
    ).toContain('https://studio.example.com');
    expect(
      mastraStudioCorsOrigins({
        httpEnabled: true,
        extraOrigin: 'http://evil.example.com',
      }),
    ).not.toContain('http://evil.example.com');
  });
});
