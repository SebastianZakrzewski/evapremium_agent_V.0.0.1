import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { ChatApi } from './chat/chat-api';

function mockApi(data: Record<string, unknown>): ChatApi {
  return {
    createSession: vi.fn(async () => ({ sessionId: 's1' })),
    postMessage: vi.fn(async () => ({
      sessionId: 's1',
      text: String(data.status ?? ''),
      data,
    })),
  };
}

describe('App', () => {
  it('renders the chat widget chrome', () => {
    render(<App api={mockApi({ status: 'miss' })} />);
    expect(screen.getByRole('heading', { name: 'EvaBot' })).toBeInTheDocument();
    expect(screen.getByText('EVA Premium')).toBeInTheDocument();
    expect(screen.getByText('Rozmowa jest zapisywana.')).toBeInTheDocument();
  });
});
