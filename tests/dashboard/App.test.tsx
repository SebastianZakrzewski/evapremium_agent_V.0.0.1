import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '@dashboard/App';

const summary = {
  date: '2026-09-13',
  relief: { sessions: 12 },
  quote: { issued: 8, violations: 1 },
  truth: { hits: 15, misses: 2 },
  lead: { created: 3, skipped: 4 },
  violations: [
    { sessionId: 'session-risk-7', reason: 'quote_without_cascade_one' },
  ],
};

describe('dashboard overview', () => {
  it('shows the token gate when no dashboard token is stored', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Panel operatora' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Token dostępu')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Przegląd doby' }),
    ).not.toBeInTheDocument();
  });

  it('loads four hypotheses and a violation snippet with bearer auth', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(summary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<App initialDate="2026-09-13" />);

    expect(
      await screen.findByRole('heading', { name: 'Przegląd doby' }),
    ).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8 wydanych · 1 naruszenie')).toBeInTheDocument();
    expect(screen.getByText('15 trafień · 2 braki')).toBeInTheDocument();
    expect(screen.getByText('3 utworzone · 4 pominięte')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'session-risk-7' }),
    ).toHaveAttribute('href', '#/sessions/session-risk-7');
    expect(screen.getByText('quote_without_cascade_one')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/dashboard/summary?date=2026-09-13',
        expect.objectContaining({
          headers: { Authorization: 'Bearer dashboard-secret' },
        }),
      ),
    );

    fetchMock.mockRestore();
  });

  it('stores the pasted token for this browser session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(summary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    render(<App initialDate="2026-09-13" />);

    fireEvent.change(screen.getByLabelText('Token dostępu'), {
      target: { value: 'new-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz panel' }));

    expect(sessionStorage.getItem('eva-dashboard-token')).toBe('new-secret');
    expect(
      await screen.findByRole('heading', { name: 'Przegląd doby' }),
    ).toBeInTheDocument();

    fetchMock.mockRestore();
  });
});

describe('dashboard sessions', () => {
  it('shows markers supplied by event-backed fixture instead of message text', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/sessions';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            sessionId: 'session-tree',
            markers: ['tree'],
            messages: [
              {
                direction: 'outbound',
                text: 'Wycena i lead są tylko tekstem, nie eventami.',
              },
            ],
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    render(<App initialDate="2026-09-13" />);

    expect(
      await screen.findByRole('heading', { name: 'Sesje' }),
    ).toBeInTheDocument();
    const sessionList = screen.getByRole('list', { name: 'Lista sesji' });
    expect(within(sessionList).getByText('Drzewo')).toBeInTheDocument();
    expect(within(sessionList).queryByText('Wycena')).not.toBeInTheDocument();
    expect(within(sessionList).queryByText('Lead')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Wycena i lead są tylko tekstem, nie eventami.'),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/sessions?date=2026-09-13',
      expect.objectContaining({
        headers: { Authorization: 'Bearer dashboard-secret' },
      }),
    );
    fireEvent.change(screen.getByLabelText('Wymiar'), {
      target: { value: 'tree' },
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/dashboard/sessions?date=2026-09-13&marker=tree',
        expect.objectContaining({
          headers: { Authorization: 'Bearer dashboard-secret' },
        }),
      ),
    );

    fetchMock.mockRestore();
  });

  it('shows transcript with timed events and amount only for quote_issued', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/sessions/session-quote';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: 'session-quote',
          messages: [
            { direction: 'inbound', text: 'Ile kosztują dywaniki?' },
            {
              direction: 'outbound',
              text: 'Orientacyjna cena to słowo, nie źródło kwoty.',
            },
          ],
          events: [
            {
              id: 'event-2',
              sessionId: 'session-quote',
              occurredAt: '2026-09-13T10:02:00.000Z',
              type: 'tool_failed',
              payload: { amount: 999, tool: 'contextTree' },
            },
            {
              id: 'event-1',
              sessionId: 'session-quote',
              occurredAt: '2026-09-13T10:01:00.000Z',
              type: 'quote_issued',
              payload: { amount: 599, currency: 'PLN' },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Sesja session-quote' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ile kosztują dywaniki?')).toBeInTheDocument();
    expect(
      screen.getByText('Orientacyjna cena to słowo, nie źródło kwoty.'),
    ).toBeInTheDocument();
    expect(screen.getByText('599 PLN')).toBeInTheDocument();
    expect(screen.queryByText(/999/)).not.toBeInTheDocument();

    const timelineItems = screen.getAllByTestId('timeline-event');
    expect(timelineItems[0]).toHaveTextContent('Wydano wycenę');
    expect(timelineItems[1]).toHaveTextContent('Błąd narzędzia');
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/sessions/session-quote',
      expect.objectContaining({
        headers: { Authorization: 'Bearer dashboard-secret' },
      }),
    );

    fetchMock.mockRestore();
  });
});

describe('dashboard context graph', () => {
  it('draws mocked leaves and lights search and hit slugs on the next frame', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/graf';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      const json = (body: unknown) =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      if (url.includes('/v1/dashboard/context-graph')) {
        return json({
          nodes: [
            { slug: 'kolory', title: 'Kolory', x: 0.2, y: 0.4 },
            { slug: 'material-eva', title: 'Materiał EVA', x: 0.7, y: 0.5 },
          ],
          edges: [
            { source: 'kolory', target: 'material-eva', similarity: 0.8 },
          ],
        });
      }
      if (url.includes('/v1/dashboard/sessions/session-tree')) {
        return json({
          sessionId: 'session-tree',
          messages: [],
          events: [
            {
              id: 'search-1',
              sessionId: 'session-tree',
              occurredAt: '2026-09-13T10:00:00.000Z',
              type: 'context_search',
              payload: {
                slugs: ['kolory', 'material-eva'],
                matched: true,
                confidence: 'ambiguous',
              },
            },
            {
              id: 'hit-1',
              sessionId: 'session-tree',
              occurredAt: '2026-09-13T10:00:01.000Z',
              type: 'context_hit',
              payload: { slug: 'material-eva' },
            },
          ],
        });
      }
      if (url.includes('/v1/dashboard/container-log')) {
        return json([
          {
            seq: 1,
            occurredAt: '2026-09-24T00:50:00.000Z',
            kind: 'intent-turn',
            sessionId: 'session-tree',
            currentIntent: 'product_info',
            candidateIntent: 'delivery',
            acceptedIntent: 'delivery',
            subIntent: null,
            mode: null,
            execution: 'profile',
            tools: ['search-leaves', 'lookup-leaf'],
            forcedOutOfScope: false,
          },
          {
            kind: 'decision-trace',
            id: 'trace-colors',
            occurredAt: '2026-09-24T00:50:00.500Z',
            sessionId: 'session-tree',
            acceptedIntent: 'product_info',
            subIntent: 'available_colors',
            mode: 'knowledge',
            execution: 'knowledge',
            tools: ['lookup-leaf', 'search-leaves'],
            forcedOutOfScope: false,
          },
          {
            seq: 2,
            occurredAt: '2026-09-24T00:50:01.000Z',
            kind: 'tool',
            toolId: 'search-leaves',
          },
          {
            seq: 3,
            occurredAt: '2026-09-24T00:50:01.100Z',
            kind: 'tree-search',
            sessionId: 'session-tree',
            preferredBranches: ['kolory'],
            rankedBranches: ['kolory', 'material'],
            leaves: [
              { slug: 'kolory', confidence: 'high' },
              { slug: 'material-eva', confidence: 'high' },
            ],
          },
          {
            seq: 4,
            occurredAt: '2026-09-24T00:50:01.200Z',
            kind: 'tree-lookup',
            sessionId: 'session-tree',
            slug: 'material-eva',
            outcome: 'hit',
            agreement: 'listed',
          },
        ]);
      }
      if (url.includes('/v1/dashboard/sessions?')) {
        return json([{ sessionId: 'session-tree', markers: ['tree'] }]);
      }
      return Promise.resolve(new Response('{}', { status: 404 }));
    });

    render(<App initialDate="2026-09-13" />);

    expect(
      await screen.findByRole('heading', { name: 'Graf kontekstu' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Kolory')).toBeInTheDocument();
    expect(screen.getByText('Materiał EVA')).toBeInTheDocument();
    expect(screen.getByTestId('graph-node-kolory')).toHaveAttribute(
      'data-state',
      'idle',
    );
    expect(screen.getByTestId('graph-node-material-eva')).toHaveAttribute(
      'data-state',
      'idle',
    );

    await screen.findByRole('option', { name: 'session-tree' });
    fireEvent.change(screen.getByLabelText('Sesja'), {
      target: { value: 'session-tree' },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Następna klatka' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Następna klatka' }));

    expect(screen.getByTestId('graph-node-kolory')).toHaveAttribute(
      'data-state',
      'candidate',
    );
    expect(screen.getByTestId('graph-node-material-eva')).toHaveAttribute(
      'data-state',
      'hit',
    );
    expect(screen.getByTestId('turn-path')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Log kontenera' })).toHaveTextContent(
      '[intent-turn] sesja session-tree',
    );
    expect(screen.getByRole('region', { name: 'Log kontenera' })).toHaveTextContent(
      /sub-intencja\s*available_colors/,
    );
    expect(screen.getByText(/użyte narzędzie: "search-leaves"/)).toBeInTheDocument();
    const log = screen.getByRole('region', { name: 'Log kontenera' });
    expect(log).toHaveTextContent(/gałęzie\s*kolory/);
    expect(log).toHaveTextContent(/ranking\s*kolory, material/);
    expect(log).toHaveTextContent(/liście\s*kolory, material-eva/);
    expect(log).toHaveTextContent(/pewność\s*wysoka/);
    expect(log).toHaveTextContent(/liść\s*material-eva/);
    expect(log).toHaveTextContent(/wynik\s*trafienie/);
    expect(log).toHaveTextContent(/zgodność\s*w rankingu/);
    expect(screen.getAllByText('w ofercie').length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/dashboard/context-graph',
      expect.objectContaining({
        headers: { Authorization: 'Bearer dashboard-secret' },
      }),
    );

    fetchMock.mockRestore();
  });

  it('keeps the container log empty when the API has no log route', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/graf';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      const json = (body: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      if (url.includes('/v1/dashboard/container-log')) {
        return json({ error: 'Route not found' }, 404);
      }
      if (url.includes('/v1/dashboard/context-graph')) {
        return json({
          nodes: [{ slug: 'kolory', title: 'Kolory', x: 0.2, y: 0.4 }],
          edges: [],
        });
      }
      if (url.includes('/v1/dashboard/sessions?')) {
        return json([]);
      }
      return json([]);
    });

    render(<App initialDate="2026-09-13" />);

    expect(await screen.findByText('Kolory')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Log kontenera' })).toHaveTextContent(
      'Brak linii w tym procesie.',
    );
    expect(
      screen.queryByText('Nie udało się pobrać danych dashboardu. Spróbuj ponownie.'),
    ).not.toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it('clears a live activity failure after the next poll succeeds', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/graf';
    let activityCalls = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      const json = (body: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      if (url.includes('/v1/dashboard/context-activity')) {
        activityCalls += 1;
        if (activityCalls === 1) {
          return json({}, 502);
        }
        return json([]);
      }
      if (url.includes('/v1/dashboard/container-log')) {
        return json([]);
      }
      if (url.includes('/v1/dashboard/context-graph')) {
        return json({
          nodes: [{ slug: 'kolory', title: 'Kolory', x: 0.2, y: 0.4 }],
          edges: [],
        });
      }
      if (url.includes('/v1/dashboard/sessions?')) {
        return json([]);
      }
      return json({});
    });

    render(<App initialDate="2026-09-13" />);

    expect(await screen.findByText('Kolory')).toBeInTheDocument();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Na żywo' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Nie udało się pobrać danych dashboardu. Spróbuj ponownie.',
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('Kolory')).toBeInTheDocument();
    } finally {
      fetchMock.mockRestore();
      vi.useRealTimers();
    }
  });

  it('does not append a decision trace already shown as an intent line', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/graf';
    let logCalls = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      const json = (body: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      if (url.includes('/v1/dashboard/container-log')) {
        logCalls += 1;
        if (logCalls === 1) {
          return json([
            {
              seq: 1,
              occurredAt: '2026-09-24T00:50:00.000Z',
              kind: 'intent-turn',
              sessionId: 'session-tree',
              acceptedIntent: 'product_info',
              subIntent: 'available_colors',
              mode: 'knowledge',
              execution: 'knowledge',
              tools: ['lookup-leaf'],
              forcedOutOfScope: false,
            },
          ]);
        }
        return json([
          {
            kind: 'decision-trace',
            id: 'trace-colors',
            occurredAt: '2026-09-24T00:50:00.400Z',
            sessionId: 'session-tree',
            acceptedIntent: 'product_info',
            subIntent: 'available_colors',
            mode: 'knowledge',
            execution: 'knowledge',
            tools: ['lookup-leaf'],
            forcedOutOfScope: false,
          },
        ]);
      }
      if (url.includes('/v1/dashboard/context-graph')) {
        return json({
          nodes: [{ slug: 'kolory', title: 'Kolory', x: 0.2, y: 0.4 }],
          edges: [],
        });
      }
      if (url.includes('/v1/dashboard/sessions?')) {
        return json([]);
      }
      return json([]);
    });

    vi.useFakeTimers();
    try {
      render(<App initialDate="2026-09-13" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.getByText('Kolory')).toBeInTheDocument();
      expect(screen.getAllByText('[intent-turn]')).toHaveLength(1);
      expect(logCalls).toBe(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(logCalls).toBe(2);
      expect(screen.getAllByText('[intent-turn]')).toHaveLength(1);
    } finally {
      fetchMock.mockRestore();
      vi.useRealTimers();
    }
  });
});

describe('dashboard analytics', () => {
  it('shows pass counts, failure reasons and a session link', async () => {
    sessionStorage.setItem('eva-dashboard-token', 'dashboard-secret');
    window.location.hash = '#/analityka';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-09-26',
          turns: 4,
          pass: 3,
          fail: 1,
          retrieval: { pass: 2, fail: 1, skipped: 1 },
          action: { pass: 4, fail: 0, skipped: 0 },
          byIntent: [{ intent: 'product_info', turns: 4, pass: 3 }],
          reasons: [{ code: 'lookup_outside', count: 1 }],
          failures: [
            {
              sessionId: 'session-miss',
              occurredAt: '2026-09-26T10:00:00.000Z',
              intent: 'product_info',
              codes: ['lookup_outside'],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    try {
      render(<App initialDate="2026-09-26" />);
      expect(
        await screen.findByRole('heading', { name: 'Analityka' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '3 z 4' })).toBeInTheDocument();
      expect(screen.getByText('Slug spoza rankingu')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'session-miss' })).toHaveAttribute(
        'href',
        '#/sessions/session-miss',
      );
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/v1/dashboard/analytics?date=2026-09-26',
          expect.objectContaining({
            headers: { Authorization: 'Bearer dashboard-secret' },
          }),
        ),
      );
    } finally {
      window.location.hash = '#/';
      fetchMock.mockRestore();
    }
  });
});
