import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';
import {
  mapAliases,
  normalizeSlots,
  resolveTemplate,
} from '@api/domain/template-cascade';

describe('template cascade', () => {
  it('normalizes raw slots without inventing keys', () => {
    expect(
      normalizeSlots({
        brand: '  VW ',
        model: 'Golf   8',
        bodyType: 'Kombi',
        year: 2021,
      }),
    ).toEqual({
      brand: 'vw',
      model: 'golf 8',
      bodyType: 'kombi',
      year: 2021,
      recordKey: undefined,
    });
  });

  it('maps aliases to canonical mat_templates keys', () => {
    expect(
      mapAliases(
        normalizeSlots({ brand: 'vw', model: 'golf 8', bodyType: 'kombi' }),
        CASCADE_ALIASES,
      ),
    ).toEqual({
      brandKey: 'Volkswagen',
      modelKey: 'Golf(MK8) 8 gen',
      bodyTypeKey: 'wagon',
    });
  });

  it('resolves full slots to one template', () => {
    const result = resolveTemplate(
      { brand: 'vw', model: 'Golf 8', bodyType: 'kombi', year: 2021 },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );

    expect(result).toEqual({
      status: 'one',
      template: expect.objectContaining({
        id: 'tmpl-golf-mk8-wagon',
        dealerPricingCategoryKey: 'passenger_car',
      }),
    });
  });

  it('returns none when the only slot has no alias', () => {
    expect(
      resolveTemplate(
        { brand: 'nieznana-marka' },
        CASCADE_TEMPLATES,
        CASCADE_ALIASES,
      ),
    ).toEqual({ status: 'none' });
  });

  it('returns many when only brand is known', () => {
    const result = resolveTemplate(
      { brand: 'volkswagen' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );

    expect(result.status).toBe('many');
    if (result.status === 'many') {
      expect(result.templates.map((row) => row.id).sort()).toEqual([
        'tmpl-golf-mk7-hatch',
        'tmpl-golf-mk7-wagon',
        'tmpl-golf-mk8-hatch',
        'tmpl-golf-mk8-wagon',
      ]);
    }
  });

  it('narrows many body variants to one with body type', () => {
    const result = resolveTemplate(
      { brand: 'vw', model: 'golf 8', bodyType: 'hatch' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );

    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk8-hatch' },
    });
  });

  it('narrows generations to one with year', () => {
    const result = resolveTemplate(
      { brand: 'vw', model: 'golf 7', bodyType: 'hatch', year: 2015 },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );

    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk7-hatch' },
    });
  });

  it('resolves an exact record_key without other slots', () => {
    const result = resolveTemplate(
      {
        recordKey: 'passenger_car|audi|a4|2015-2023|sedan|5',
      },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );

    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-audi-a4-sedan' },
    });
  });

  it('ignores an unmapped extra slot instead of inventing a key', () => {
    const withNoise = resolveTemplate(
      { brand: 'vw', model: 'golf-xyz' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );
    const brandOnly = resolveTemplate(
      { brand: 'vw' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
    );

    expect(withNoise).toEqual(brandOnly);
    expect(withNoise.status).toBe('many');
  });
});
