import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatApi, ChatTurn, CreatedSession } from '@widget/chat/chat-api';
import { ChatPanel } from '@widget/chat/ChatPanel';
import { TURN_BUDGET_MESSAGE, TurnBudgetExceededError } from '@widget/chat/turn-budget';

const opener: CreatedSession = {
  sessionId: 's1',
  greeting:
    'Pomagam sprawdzić, czy mamy szablon dywaników EVA pod Twoją markę, model i rocznik, podać orientacyjną cenę kompletu oraz odpowiedzieć o piance EVA, kolorach, czasie szycia, dostawie kurierem, gwarancji i czyszczeniu. Cena i fakty biorę z katalogu sklepu — nie zgaduję.\n\nWybierz pytanie albo napisz własne.',
  suggestions: [
    {
      id: 'fit',
      label: 'Szablon pod markę i model?',
      message:
        'Czy macie dywaniki EVA dopasowane do mojej marki, modelu i rocznika?',
    },
    {
      id: 'pricing',
      label: 'Cena kompletu do auta?',
      message:
        'Jaka jest orientacyjna cena kompletu dywaników EVA do mojego auta?',
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

  it('shows a live typing status while the assistant is answering', async () => {
    let finish: (() => void) | undefined;
    const api: ChatApi = {
      createSession: vi.fn(async () => opener),
      postMessage: vi.fn(
        () =>
          new Promise<ChatTurn>((resolve) => {
            finish = () =>
              resolve({
                sessionId: 's1',
                text: 'Gotowe.',
                data: { status: 'generated' },
              });
          }),
      ),
    };
    render(<ChatPanel api={api} />);
    expect(await screen.findByText(/Online/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8 komplet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(await screen.findByText('pisze…')).toBeInTheDocument();
    expect(screen.getByLabelText('Pisze')).toBeInTheDocument();
    await act(async () => {
      finish?.();
    });
    expect(await screen.findByText('Gotowe.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('pisze…')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Online/)).toBeInTheDocument();
  });

  it('keeps the send button disabled until the draft has text', async () => {
    render(<ChatPanel api={mockApi({ status: 'generated' })} />);
    const send = screen.getByRole('button', { name: 'Wyślij' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: '   ' },
    });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8' },
    });
    expect(send).toBeEnabled();
    await screen.findByText(/szablon dywaników EVA/);
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
      await screen.findByRole('button', { name: 'Szablon pod markę i model?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/szablon dywaników EVA/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Szablon pod markę i model?' }));
    expect(await screen.findByText('Podaj markę, model i rocznik.')).toBeInTheDocument();
    expect(api.postMessage).toHaveBeenCalledWith(
      's1',
      'Czy macie dywaniki EVA dopasowane do mojej marki, modelu i rocznika?',
      expect.any(Function),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Szablon pod markę i model?' }),
      ).not.toBeInTheDocument();
    });
  });

  it('shows the shop product card after the agent verifies brand and model', async () => {
    window.history.pushState(
      {},
      '',
      '/?cardUrl=' +
        encodeURIComponent('https://shop.example/dywaniki?brand={brand_key}'),
    );
    const api = mockApi({
      status: 'generated',
      product: {
        productId: 'audi-a4',
        fields: { brand_key: 'audi' },
      },
    });
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'audi a4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    const card = await screen.findByTitle('Karta produktu');
    expect(card).toHaveAttribute('src', 'https://shop.example/dywaniki?brand=audi');
  });

  it('stops the panel when the turn budget is spent', async () => {
    const api = mockApi({ status: 'generated' });
    api.postMessage = vi.fn(async () => {
      throw new TurnBudgetExceededError();
    });
    render(<ChatPanel api={api} />);
    expect(
      await screen.findByRole('button', { name: 'Szablon pod markę i model?' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(await screen.findByText(TURN_BUDGET_MESSAGE)).toBeInTheDocument();
    expect(screen.getByLabelText('Wiadomość')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Szablon pod markę i model?' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'jeszcze raz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(api.postMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps the composer editable after a network error', async () => {
    const api = mockApi({ status: 'generated' });
    api.postMessage = vi.fn(async () => {
      throw new Error('network');
    });
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'golf 8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(
      await screen.findByText('Nie udało się dokończyć tej odpowiedzi.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Wiadomość')).toBeEnabled();
  });

  it('renders a contact form and sends the name and phone without an email', async () => {
    const api = mockApi({ status: 'generated', contactForm: true });
    render(<ChatPanel api={api} />);
    fireEvent.change(screen.getByLabelText('Wiadomość'), {
      target: { value: 'ile kosztują' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));

    expect(await screen.findByRole('form', { name: 'Dane kontaktowe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wyślij kontakt' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Imię'), { target: { value: 'Anna' } });
    fireEvent.change(screen.getByLabelText('Numer kontaktowy'), {
      target: { value: '500 600 700' },
    });
    expect(screen.getByLabelText(/Adres e-mail/)).not.toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij kontakt' }));

    await waitFor(() => {
      expect(api.postMessage).toHaveBeenLastCalledWith(
        's1',
        'Nazywam się Anna, tel. 500600700',
        expect.any(Function),
      );
    });
  });
});
