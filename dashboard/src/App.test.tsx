import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

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
    expect(screen.getByText('session-risk-7')).toBeInTheDocument();
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
