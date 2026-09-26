import { advanceFitmentCascade } from '@api/domain/fitment-session';
import { readBodyType, readYear } from '@api/domain/quote-vehicle';
import { resolveTemplate } from '@api/domain/template-cascade';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';

describe('fitment session', () => {
  const resolve = (input: {
    brand?: string;
    model?: string;
    bodyType?: string;
    year?: number;
  }) => Promise.resolve(resolveTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES));

  it('asks for year before it runs the cascade', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8' },
      resolve,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: { missing: 'year', step: 'waiting_for_vehicle' },
    });
  });

  it('maps a short body reply onto a body alias', () => {
    expect(readBodyType('hatcback')).toBe('hatchback');
    expect(readBodyType('kombi')).toBe('kombi');
    expect(readYear('rocznik 2019')).toBe(2019);
  });

  it('resolves one template only after brand, model, year and body', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2021 },
      resolve,
    });
    expect(waiting.status).toBe('suspended');
    if (waiting.status !== 'suspended') {
      return;
    }

    const ready = await advanceFitmentCascade({
      slots: waiting.snapshot.slots,
      message: 'hatcback',
      resolve,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { bodyTypeKey: 'hatchback' } },
    });
  });
});
