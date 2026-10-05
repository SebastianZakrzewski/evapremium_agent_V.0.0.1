import { chooseExecution } from '@api/domain/choose-execution';
import { subIntentBySlug } from '@api/domain/sub-intent-catalog';

describe('chooseExecution', () => {
  const quote = subIntentBySlug('indicative_quote');
  if (quote === undefined) {
    throw new Error('indicative_quote is required');
  }

  it('does not call quote-price for a knowledge question about price', () => {
    expect(
      chooseExecution({
        mode: 'knowledge',
        entities: {},
        config: quote,
      }),
    ).toEqual({ kind: 'knowledge', tools: [] });
  });

  it('starts fitment_cascade for a quote action with a complete car', () => {
    expect(
      chooseExecution({
        mode: 'action',
        entities: {
          car_brand: 'Volkswagen',
          car_model: 'Golf 8',
          year: 2019,
          body_type: 'kombi',
        },
        config: quote,
      }),
    ).toEqual({ kind: 'workflow', workflow: 'fitment_cascade' });
  });

  it('starts fitment_cascade when the quote action is missing a slot', () => {
    expect(
      chooseExecution({
        mode: 'action',
        entities: { car_model: 'Golf 8' },
        config: quote,
      }),
    ).toEqual({ kind: 'workflow', workflow: 'fitment_cascade' });
  });

  it('starts fitment_cascade when a knowledge question already names the car', () => {
    const fitment = subIntentBySlug('fitment');
    if (fitment === undefined) {
      throw new Error('fitment is required');
    }
    expect(
      chooseExecution({
        mode: 'knowledge',
        entities: { car_brand: 'Toyota', car_model: 'RAV4' },
        config: fitment,
      }),
    ).toEqual({ kind: 'workflow', workflow: 'fitment_cascade' });
  });

  it('keeps a fitment question without a car on faq tools', () => {
    const fitment = subIntentBySlug('fitment');
    if (fitment === undefined) {
      throw new Error('fitment is required');
    }
    expect(
      chooseExecution({
        mode: 'knowledge',
        entities: {},
        config: fitment,
      }),
    ).toEqual({ kind: 'knowledge', tools: ['lookup-leaf', 'search-leaves'] });
  });

  it('runs a complete fitment action through the cascade workflow', () => {
    const fitment = subIntentBySlug('fitment');
    if (fitment === undefined) {
      throw new Error('fitment is required');
    }
    expect(
      chooseExecution({
        mode: 'action',
        entities: {
          car_brand: 'Volkswagen',
          car_model: 'Golf 8',
          year: 2019,
          body_type: 'kombi',
        },
        config: fitment,
      }),
    ).toEqual({ kind: 'workflow', workflow: 'fitment_cascade' });
  });

  it('calls collect-contact for a contact request', () => {
    const contact = subIntentBySlug('contact_request');
    if (contact === undefined) {
      throw new Error('contact_request is required');
    }
    expect(
      chooseExecution({
        mode: 'action',
        entities: {},
        config: contact,
      }),
    ).toEqual({
      kind: 'tool',
      tool: 'collect-contact',
      tools: ['collect-contact'],
    });
  });

  it('clarifies an ambiguous mode without tools', () => {
    const colors = subIntentBySlug('available_colors');
    if (colors === undefined) {
      throw new Error('available_colors is required');
    }
    expect(
      chooseExecution({
        mode: 'ambiguous',
        entities: {},
        config: colors,
      }),
    ).toEqual({ kind: 'clarify' });
  });
});
