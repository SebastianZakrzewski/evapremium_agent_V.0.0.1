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

  it('points at quote-vehicle when brand and model are present', () => {
    expect(
      chooseExecution({
        mode: 'action',
        entities: { car_brand: 'Volkswagen', car_model: 'Golf 8' },
        config: quote,
      }),
    ).toEqual({
      kind: 'tool',
      tool: 'quote-vehicle',
      tools: ['quote-vehicle'],
    });
  });

  it('starts quote_vehicle when the action is missing a slot', () => {
    expect(
      chooseExecution({
        mode: 'action',
        entities: { car_model: 'Golf 8' },
        config: quote,
      }),
    ).toEqual({ kind: 'workflow', workflow: 'quote_vehicle' });
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
