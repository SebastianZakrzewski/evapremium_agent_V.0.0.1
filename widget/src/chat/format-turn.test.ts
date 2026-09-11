import { describe, expect, it } from 'vitest';
import { formatAssistantTurn } from './format-turn';

describe('formatAssistantTurn', () => {
  it('formats an indicative quote without inventing the amount', () => {
    expect(
      formatAssistantTurn({
        text: 'quoted',
        data: { status: 'quoted', amount: 599, currency: 'PLN' },
      }),
    ).toBe(
      'Wycena orientacyjna: 599 PLN. Cena ostateczna w konfiguratorze.',
    );
  });

  it('formats a miss without store policy copy', () => {
    expect(formatAssistantTurn({ text: 'miss', data: { status: 'miss' } })).toBe(
      'Nie mam tego w wiedzy sklepu. Mogę połączyć z obsługą po zgodzie na kontakt.',
    );
    expect(
      formatAssistantTurn({ text: 'miss', data: { status: 'miss' } }),
    ).not.toMatch(/gwarancja dożywotnia/i);
  });

  it('shows Mastra generated text when status is not quoted or miss', () => {
    expect(
      formatAssistantTurn({
        text: 'Wycena orientacyjna z macierzy: 599 PLN.',
        data: { status: 'generated' },
      }),
    ).toBe('Wycena orientacyjna z macierzy: 599 PLN.');
  });
});
