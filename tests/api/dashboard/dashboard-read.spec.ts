import { dashboardBearerOk } from '@api/dashboard/dashboard-auth';
import {
  applyDashboardCors,
  dashboardAllowOrigin,
  dashboardCorsOrigins,
} from '@api/dashboard/dashboard-cors';
import type { AgentEvent } from '@api/agent-events/agent-event';
import {
  listSessionMarkers,
  sessionView,
  summarizeDay,
  timelineEvents,
} from '@api/dashboard/dashboard-read';

describe('dashboard auth and CORS', () => {
  it('rejects missing bearer and the studio token', () => {
    const env = {
      DASHBOARD_TOKEN: 'dash-secret',
      MASTRA_STUDIO_TOKEN: 'studio-secret',
    };
    expect(dashboardBearerOk(undefined, env)).toBe(false);
    expect(dashboardBearerOk('Bearer studio-secret', env)).toBe(false);
    expect(dashboardBearerOk('Bearer dash-secret', env)).toBe(true);
  });

  it('rejects dashboard token when it equals the studio token', () => {
    const env = {
      DASHBOARD_TOKEN: 'same',
      MASTRA_STUDIO_TOKEN: 'same',
    };
    expect(dashboardBearerOk('Bearer same', env)).toBe(false);
  });

  it('allows only DASHBOARD_ORIGIN, not shop origins', () => {
    expect(dashboardCorsOrigins('https://dash.vercel.app/')).toEqual([
      'https://dash.vercel.app',
    ]);
    expect(
      dashboardAllowOrigin('https://evapremium.pl', 'https://dash.vercel.app'),
    ).toBeUndefined();
    expect(
      dashboardAllowOrigin('https://dash.vercel.app', 'https://dash.vercel.app'),
    ).toBe('https://dash.vercel.app');
  });

  it('does not set ACAO for a shop origin on dashboard paths', () => {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': 'https://evapremium.pl',
    };
    const previous = process.env.DASHBOARD_ORIGIN;
    process.env.DASHBOARD_ORIGIN = 'https://dash.vercel.app';
    applyDashboardCors(
      {
        path: '/v1/dashboard/summary',
        method: 'GET',
        headers: { origin: 'https://evapremium.pl' },
      },
      {
        header(name, value) {
          headers[name] = value;
        },
        removeHeader(name) {
          delete headers[name];
        },
        status() {
          return { end() {} };
        },
      },
      () => {},
    );
    process.env.DASHBOARD_ORIGIN = previous;
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});

describe('dashboard KPI from events', () => {
  const events: AgentEvent[] = [
    {
      id: '1',
      sessionId: 's-relief',
      occurredAt: '2026-09-13T10:00:00.000Z',
      type: 'cascade_resolved',
      payload: { match: 'one' },
    },
    {
      id: '2',
      sessionId: 's-relief',
      occurredAt: '2026-09-13T10:01:00.000Z',
      type: 'quote_issued',
      payload: { amount: 599, currency: 'PLN' },
    },
    {
      id: '3',
      sessionId: 's-miss',
      occurredAt: '2026-09-13T11:00:00.000Z',
      type: 'context_miss',
      payload: { slug: 'pielegnacja' },
    },
    {
      id: '4',
      sessionId: 's-bad-quote',
      occurredAt: '2026-09-13T12:00:00.000Z',
      type: 'cascade_resolved',
      payload: { match: 'none' },
    },
    {
      id: '5',
      sessionId: 's-bad-quote',
      occurredAt: '2026-09-13T12:01:00.000Z',
      type: 'quote_issued',
      payload: { amount: 1, currency: 'PLN' },
    },
    {
      id: '6',
      sessionId: 's-lead',
      occurredAt: '2026-09-13T13:00:00.000Z',
      type: 'lead_attempted',
      payload: { outcome: 'skipped_no_consent' },
    },
  ];

  it('counts four hypotheses from events, not agent text', () => {
    expect(summarizeDay('2026-09-13', events)).toEqual({
      date: '2026-09-13',
      relief: { sessions: 2 },
      quote: { issued: 2, violations: 1 },
      truth: { hits: 0, misses: 1 },
      lead: { created: 0, skipped: 1 },
      violations: [
        { sessionId: 's-bad-quote', reason: 'quote_without_cascade_one' },
      ],
    });
  });

  it('lists session markers from event types', () => {
    expect(listSessionMarkers(events, 'violation')).toEqual([
      {
        sessionId: 's-bad-quote',
        markers: ['cascade', 'quote', 'violation'],
      },
    ]);
  });

  it('orders session events by occurredAt', () => {
    expect(
      timelineEvents([events[1], events[0]]).map((row) => row.id),
    ).toEqual(['1', '2']);
  });

  it('joins transcript direction/text with timed events', () => {
    expect(
      sessionView(
        's-relief',
        [
          { role: 'user', body: 'ile kosztuje?' },
          { role: 'assistant', body: 'quoted' },
        ],
        [events[1], events[0]],
      ),
    ).toEqual({
      sessionId: 's-relief',
      messages: [
        { direction: 'inbound', text: 'ile kosztuje?' },
        { direction: 'outbound', text: 'quoted' },
      ],
      events: [events[0], events[1]],
    });
  });
});
