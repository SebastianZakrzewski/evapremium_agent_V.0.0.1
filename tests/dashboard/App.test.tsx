import {
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
