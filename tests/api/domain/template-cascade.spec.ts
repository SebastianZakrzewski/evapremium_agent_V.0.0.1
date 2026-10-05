import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';
import {
  mapAliases,
  normalizeSlots,
  resolveClassifiedTemplate,
  resolveTemplate,
  shortlistModelKeys,
  type MatTemplate,
  type VehicleKeyClassifier,
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

  it('collapses duplicate rows of the same vehicle to one template', () => {
    const wagon = CASCADE_TEMPLATES.find((row) => row.id === 'tmpl-golf-mk8-wagon');
    if (!wagon) {
      throw new Error('fixture missing golf mk8 wagon');
    }
    const copy: MatTemplate = {
      ...wagon,
      id: 'tmpl-golf-mk8-wagon-copy',
      recordKey: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|wagon|9',
    };

    const result = resolveTemplate(
      { brand: 'vw', model: 'Golf 8', bodyType: 'kombi', year: 2021 },
      [copy, wagon],
      CASCADE_ALIASES,
    );

    expect(result).toEqual({
      status: 'one',
      template: wagon,
    });
  });

  it('collapses model keys that differ only by spaces and letter case', () => {
    const thirdGen: MatTemplate = {
      id: 'tmpl-rav4-xa30',
      recordKey: 'passenger_car|toyota|rav4_xa30_3_gen|2005-2012|suv|2550',
      brandKey: 'Toyota ',
      modelKey: 'Rav4 (XA30) 3 gen',
      dealerPricingCategoryKey: 'passenger_car',
      isActive: true,
      yearFrom: 2005,
      yearTo: 2012,
      isOpenEnded: false,
      bodyTypeKey: 'suv',
      bodyType1Key: 'suv',
      bodyType2Key: null,
      bodyType3Key: null,
      generation: '2005-2012',
    };
    const spaced: MatTemplate = {
      ...thirdGen,
      id: 'tmpl-rav-4-xa30',
      recordKey: 'passenger_car|toyota|rav_4_xa30_3_gen|2005-2012|suv|2548',
      modelKey: 'Rav 4 (XA30) 3 gen',
    };
    const secondGen: MatTemplate = {
      ...thirdGen,
      id: 'tmpl-rav4-xa20',
      recordKey: 'passenger_car|toyota|rav4_xa20_2_gen|2000-2006|suv|2500',
      modelKey: 'Rav4 (XA20) 2 gen',
      yearFrom: 2000,
      yearTo: 2006,
      generation: '2000-2006',
    };

    const same = resolveTemplate(
      { brand: 'toyota', year: 2005, bodyType: 'suv' },
      [spaced, thirdGen],
      [
        {
          slotKind: 'brand',
          aliasNormalized: 'toyota',
          canonicalKey: 'Toyota ',
          brandKey: null,
        },
        {
          slotKind: 'body_type',
          aliasNormalized: 'suv',
          canonicalKey: 'suv',
          brandKey: null,
        },
      ],
    );
    const generations = resolveTemplate(
      { brand: 'toyota', year: 2005, bodyType: 'suv' },
      [secondGen, thirdGen],
      [
        {
          slotKind: 'brand',
          aliasNormalized: 'toyota',
          canonicalKey: 'Toyota ',
          brandKey: null,
        },
        {
          slotKind: 'body_type',
          aliasNormalized: 'suv',
          canonicalKey: 'suv',
          brandKey: null,
        },
      ],
    );

    expect(same).toEqual({ status: 'one', template: thirdGen });
    expect(generations.status).toBe('many');
  });

  it('keeps distinct vehicles when only one of them is duplicated', () => {
    const hatch = CASCADE_TEMPLATES.find((row) => row.id === 'tmpl-golf-mk8-hatch');
    const wagon = CASCADE_TEMPLATES.find((row) => row.id === 'tmpl-golf-mk8-wagon');
    if (!hatch || !wagon) {
      throw new Error('fixture missing golf mk8 templates');
    }
    const hatchCopy: MatTemplate = {
      ...hatch,
      id: 'tmpl-golf-mk8-hatch-copy',
      recordKey: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|hatchback|99',
    };

    const result = resolveTemplate(
      { brand: 'vw', model: 'golf 8' },
      [hatchCopy, wagon, hatch],
      CASCADE_ALIASES,
    );

    expect(result.status).toBe('many');
    if (result.status === 'many') {
      expect(result.templates.map((row) => row.id)).toEqual([
        'tmpl-golf-mk8-hatch',
        'tmpl-golf-mk8-wagon',
      ]);
    }
  });
});

function classifying(brandKey: string | null, modelKeys: string[]): VehicleKeyClassifier {
  return {
    classifyBrand: async () => brandKey,
    classifyModel: async () => modelKeys,
  };
}

describe('classified template cascade', () => {
  it('resolves a misspelled brand and model to the matching templates', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'Volwagen', model: 'golf 8' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifying('Volkswagen', ['Golf(MK8) 8 gen']),
    );

    expect(result).toMatchObject({
      status: 'many',
      templates: [{ id: 'tmpl-golf-mk8-hatch' }, { id: 'tmpl-golf-mk8-wagon' }],
    });
  });

  it('classifies a body the alias table does not know', async () => {
    let calls = 0;
    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'golf 8', bodyType: 'suv' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      {
        classifyBrand: async () => null,
        classifyModel: async () => [],
        classifyBody: async () => {
          calls += 1;
          return 'hatchback';
        },
      },
    );

    expect(calls).toBe(1);
    expect(result).toMatchObject({
      status: 'one',
      bodyTypeKey: 'hatchback',
      template: { id: 'tmpl-golf-mk8-hatch' },
    });
  });

  it('does not classify a body that already has an alias', async () => {
    let calls = 0;
    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'golf 8', bodyType: 'kombi' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      {
        classifyBrand: async () => null,
        classifyModel: async () => [],
        classifyBody: async () => {
          calls += 1;
          return 'hatchback';
        },
      },
    );

    expect(calls).toBe(0);
    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk8-wagon' },
    });
    expect(result.bodyTypeKey).toBeUndefined();
  });

  it('narrows classified keys with the body alias', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'Volwagen', model: 'golf 8', bodyType: 'kombi' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifying('Volkswagen', ['Golf(MK8) 8 gen']),
    );

    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk8-wagon' },
    });
  });

  it('drops a model key that was not on the candidate list', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'golf 8' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifying('Volkswagen', ['Golf(MK8) 8 gen', 'Nope']),
    );

    expect(result).toMatchObject({
      status: 'many',
      templates: [{ id: 'tmpl-golf-mk8-hatch' }, { id: 'tmpl-golf-mk8-wagon' }],
    });
  });

  it('resolves a model alias when the brand text is still empty', async () => {
    let brandCalls = 0;
    let modelCalls = 0;
    const result = await resolveClassifiedTemplate(
      { model: 'golf 8' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      {
        classifyBrand: async () => {
          brandCalls += 1;
          return null;
        },
        classifyModel: async () => {
          modelCalls += 1;
          return [];
        },
      },
    );

    expect(brandCalls).toBe(0);
    expect(modelCalls).toBe(0);
    expect(result.status).toBe('many');
  });

  it('classifies a brand when the model text is still empty', async () => {
    let brandCalls = 0;
    const result = await resolveClassifiedTemplate(
      { brand: 'Volwagen' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      {
        classifyBrand: async () => {
          brandCalls += 1;
          return 'Volkswagen';
        },
        classifyModel: async () => {
          throw new Error('model classifier should not run');
        },
      },
    );

    expect(brandCalls).toBe(1);
    expect(result.status).toBe('many');
  });

  it('drops a brand the classifier cannot place on a catalog key', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'nieznana' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      {
        classifyBrand: async () => null,
        classifyModel: async () => [],
      },
    );

    expect(result).toEqual({
      status: 'none',
      droppedBrand: true,
      mismatches: [{ slot: 'car_brand', value: 'nieznana' }],
    });
  });

  it('keeps every generation the classifier returns', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'golf' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifying('Volkswagen', ['Golf(MK7) 7 gen', 'Golf(MK8) 8 gen']),
    );

    expect(result.status).toBe('many');
    if (result.status !== 'many') {
      return;
    }
    expect(result.templates.map((template) => template.id)).toEqual([
      'tmpl-golf-mk8-hatch',
      'tmpl-golf-mk8-wagon',
      'tmpl-golf-mk7-hatch',
      'tmpl-golf-mk7-wagon',
    ]);
  });

  it('shortlists the closest model keys for one brand', () => {
    const extras: MatTemplate[] = Array.from({ length: 12 }, (_, index) => ({
      id: `tmpl-zz-${index}`,
      recordKey: `zz-${index}`,
      brandKey: 'Volkswagen',
      modelKey: `zz-${index}`,
      dealerPricingCategoryKey: 'passenger_car',
      isActive: true,
      yearFrom: 2019,
      yearTo: null,
      isOpenEnded: true,
      bodyTypeKey: 'hatchback',
      bodyType1Key: 'hatchback',
      bodyType2Key: null,
      bodyType3Key: null,
    }));

    const listed = shortlistModelKeys(
      [...CASCADE_TEMPLATES, ...extras],
      'Volkswagen',
      'golf 8',
    );

    expect(listed).toHaveLength(12);
    expect(listed).toContain('Golf(MK8) 8 gen');
    expect(listed).not.toContain('A4');
  });

  it('accepts a trimmed brand when the catalog key has one trailing space', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'toyot', model: 'rav4' },
      [spacedTemplate('Toyota ', 'RAV4')],
      CASCADE_ALIASES,
      classifying('Toyota', ['RAV4']),
    );

    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-spaced' },
    });
  });

  it('uses the alias and does not call the classifier', async () => {
    const classifier: VehicleKeyClassifier = {
      classifyBrand: async () => {
        throw new Error('brand classifier should not run');
      },
      classifyModel: async () => {
        throw new Error('model classifier should not run');
      },
    };

    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'golf 8', bodyType: 'kombi', year: 2021 },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifier,
    );

    expect(result).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk8-wagon' },
    });
  });

  it('passes the year into model classification', async () => {
    let seenYear: number | undefined;
    const classifier: VehicleKeyClassifier = {
      classifyBrand: async () => 'Volkswagen',
      classifyModel: async (input) => {
        seenYear = input.year;
        return ['Golf(MK7) 7 gen'];
      },
    };

    await resolveClassifiedTemplate(
      { brand: 'Volwagen', model: 'golf', year: 2015 },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifier,
    );

    expect(seenYear).toBe(2015);
  });

  it('reports a year outside the chosen model instead of a nearby model', async () => {
    const cla: MatTemplate = {
      id: 'tmpl-cla',
      recordKey: 'cla',
      brandKey: 'Mercedes-Benz',
      modelKey: 'CLA 1 gen (C117)',
      dealerPricingCategoryKey: 'passenger_car',
      isActive: true,
      yearFrom: 2013,
      yearTo: 2019,
      isOpenEnded: false,
      bodyTypeKey: 'sedan',
      bodyType1Key: 'sedan',
      bodyType2Key: null,
      bodyType3Key: null,
      generation: '2013-2019',
    };
    const cClass: MatTemplate = {
      ...cla,
      id: 'tmpl-c-class',
      recordKey: 'c-class',
      modelKey: 'C-klasa 3 gen (W204)',
      yearFrom: 2006,
      yearTo: 2015,
      generation: '2006-2015',
    };

    const result = await resolveClassifiedTemplate(
      { brand: 'mercedes', model: 'cla', year: 2012 },
      [cla, cClass],
      [],
      classifying('Mercedes-Benz', ['CLA 1 gen (C117)']),
    );

    expect(result).toEqual({
      status: 'none',
      mismatches: [{ slot: 'year', value: '2012' }],
    });
  });

  it('reports a body type that is not on the variant', () => {
    expect(
      resolveTemplate(
        { brand: 'vw', model: 'golf 8', bodyType: 'sedan', year: 1990 },
        CASCADE_TEMPLATES,
        CASCADE_ALIASES,
      ),
    ).toEqual({
      status: 'none',
      mismatches: [
        { slot: 'year', value: '1990' },
        { slot: 'body_type', value: 'sedan' },
      ],
    });
  });

  it('reports a model the classifier cannot place', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'panda' },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifying('Volkswagen', []),
    );

    expect(result).toEqual({
      status: 'none',
      droppedModel: true,
      mismatches: [{ slot: 'car_model', value: 'panda' }],
    });
  });

  it('retries the shortlist when the classified generation misses the year', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'vw', model: 'golf', year: 2015 },
      CASCADE_TEMPLATES,
      CASCADE_ALIASES,
      classifying('Volkswagen', ['Golf(MK8) 8 gen']),
    );

    expect(result.status).toBe('many');
    if (result.status !== 'many') {
      return;
    }
    expect(result.templates.map((template) => template.id).sort()).toEqual([
      'tmpl-golf-mk7-hatch',
      'tmpl-golf-mk7-wagon',
    ]);
  });

  it('ranks a spelled generation above the other one', () => {
    const listed = shortlistModelKeys(
      CASCADE_TEMPLATES,
      'Volkswagen',
      'ósemka',
    );

    expect(listed[0]).toBe('Golf(MK8) 8 gen');
  });

  it('returns none when trim matches two brand keys', async () => {
    const result = await resolveClassifiedTemplate(
      { brand: 'citroen', model: 'c4' },
      [spacedTemplate('Citroen', 'C4'), spacedTemplate('Citroen ', 'C4')],
      CASCADE_ALIASES,
      classifying(' Citroen', ['C4']),
    );

    expect(result).toEqual({
      status: 'none',
      droppedBrand: true,
      mismatches: [{ slot: 'car_brand', value: 'citroen' }],
    });
  });
});

function spacedTemplate(brandKey: string, modelKey: string): MatTemplate {
  return {
    id: 'tmpl-spaced',
    recordKey: `${brandKey}|${modelKey}`,
    brandKey,
    modelKey,
    dealerPricingCategoryKey: 'passenger_car',
    isActive: true,
    yearFrom: 2019,
    yearTo: null,
    isOpenEnded: true,
    bodyTypeKey: 'suv',
    bodyType1Key: 'suv',
    bodyType2Key: null,
    bodyType3Key: null,
  };
}
