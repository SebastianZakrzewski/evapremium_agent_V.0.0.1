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

  it('asks for the body that still splits one generation', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8' },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'body_type',
        step: 'waiting_for_vehicle',
        options: ['hatchback', 'wagon'],
        slots: { car_brand: 'vw', car_model: 'golf 8' },
      },
    });
  });

  it('maps a short body reply onto a body alias', () => {
    expect(readBodyType('hatcback')).toBe('hatchback');
    expect(readBodyType('kombi')).toBe('kombi');
    expect(readYear('rocznik 2019')).toBe(2019);
  });

  it('resolves one template once the remaining body is known', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2021 },
      resolve,
      aliases: CASCADE_ALIASES,
    });
    expect(waiting.status).toBe('suspended');
    if (waiting.status !== 'suspended') {
      return;
    }

    const ready = await advanceFitmentCascade({
      slots: waiting.snapshot.slots,
      message: 'hatcback',
      asked: waiting.snapshot.missing,
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { bodyTypeKey: 'hatchback' } },
    });
  });

  it('resolves the only body without asking for year', async () => {
    const ready = await advanceFitmentCascade({
      slots: { car_brand: 'audi', car_model: 'a4' },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { id: 'tmpl-audi-a4-sedan' } },
    });
  });

  it('asks again for year when the given year matches nothing', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2005 },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'year',
        options: ['2019+'],
        slots: { car_brand: 'vw', car_model: 'golf 8' },
      },
    });
  });
});
