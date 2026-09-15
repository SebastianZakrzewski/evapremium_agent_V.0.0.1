import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatApi, CreatedSession } from '@widget/chat/chat-api';
import { ChatPanel } from '@widget/chat/ChatPanel';

const opener: CreatedSession = {
  sessionId: 's1',
  greeting:
    'Pomagam dobrać dywaniki EVA do auta, podać orientacyjną wycenę i odpowiedzieć na pytania o materiał, dostawę, gwarancję i pielęgnację. Cena i fakty biorę z katalogu sklepu — nie zgaduję.\n\nWybierz temat albo napisz własne pytanie.',
  suggestions: [
    {
      id: 'fit',
      label: 'Dopasowanie do auta',
      message: 'Chcę dobrać dywaniki EVA do mojego auta.',
    },
    {
      id: 'pricing',
      label: 'Wycena orientacyjna',
      message: 'Ile kosztują dywaniki EVA do mojego auta?',
    },
  ],
};

function mockApi(data: Record<string, unknown>): ChatApi {
  return {
    createSession: vi.fn(async () => opener),
    postMessage: vi.fn(async () => ({
      sessionId: 's1',
      text: String(data.status ?? ''),
      data,
    })),
  };
}

describe('ChatPanel', () => {
  it('shows an indicative quote from the API payload', async () => {
    const api = mockApi({
      status: 'quoted',
      amount: 599,
      currency: 'PLN',
    });
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8 komplet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(
      await screen.findByText(
        'Wycena orientacyjna: 599 PLN. Cena ostateczna w konfiguratorze.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Rozmowa jest zapisywana.')).toBeInTheDocument();
  });

  it('shows a miss without inventing store policy', async () => {
    const api = mockApi({ status: 'miss' });
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'gwarancja xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(
      await screen.findByText(
        'Nie mam tego w wiedzy sklepu. Mogę połączyć z obsługą po zgodzie na kontakt.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/gwarancja dożywotnia/i)).not.toBeInTheDocument();
  });

  it('shows generated assistant text from the API', async () => {
    const api = mockApi({ status: 'generated' });
    api.postMessage = vi.fn(async () => ({
      sessionId: 's1',
      text: 'Komplet dywaników: wycena orientacyjna 599 PLN.',
      data: { status: 'generated' },
    }));
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8 komplet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(
      await screen.findByText('Komplet dywaników: wycena orientacyjna 599 PLN.'),
    ).toBeInTheDocument();
  });

  it('streams generated assistant tokens from SSE deltas', async () => {
    const api: ChatApi = {
      createSession: vi.fn(async () => opener),
      postMessage: vi.fn(async (_sessionId, _message, onDelta) => {
        onDelta?.('Komplet ');
        onDelta?.('dywaników');
        return {
          sessionId: 's1',
          text: 'Komplet dywaników',
          data: { status: 'generated' },
        };
      }),
    };
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8 komplet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(await screen.findByText('Komplet dywaników')).toBeInTheDocument();
  });

  it('opens a session with greeting chips and sends the chip message', async () => {
    const api = mockApi({ status: 'generated' });
    api.postMessage = vi.fn(async () => ({
      sessionId: 's1',
      text: 'Podaj markę, model i rocznik.',
      data: { status: 'generated' },
    }));
    render(<ChatPanel api={api} />);
    expect(
      await screen.findByRole('button', { name: 'Dopasowanie do auta' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pomagam dobrać dywaniki EVA/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dopasowanie do auta' }));
    expect(await screen.findByText('Podaj markę, model i rocznik.')).toBeInTheDocument();
    expect(api.postMessage).toHaveBeenCalledWith(
      's1',
      'Chcę dobrać dywaniki EVA do mojego auta.',
      expect.any(Function),
    );
    expect(
      screen.queryByRole('button', { name: 'Dopasowanie do auta' }),
    ).not.toBeInTheDocument();
  });
});
