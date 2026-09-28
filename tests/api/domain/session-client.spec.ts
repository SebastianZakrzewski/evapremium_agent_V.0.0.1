import {
  conflictsWithStoredVehicle,
  contextNeedForTurn,
  SessionClient,
  shouldRememberQualifierEntities,
} from '@api/domain/session-client';

describe('session client', () => {
  it('stores a name, contact and consent from the client utterance', () => {
    const client = SessionClient.empty('s1').rememberUtterance(
      'Nazywam się Anna Kowalska, tel. 500600700, anna@example.com, wyrażam zgodę',
      '2026-09-27T12:00:00.000Z',
    );

    expect(client.data).toMatchObject({
      givenName: 'Anna',
      familyName: 'Kowalska',
      phone: '500600700',
      email: 'anna@example.com',
      contactConsent: true,
      consentAt: '2026-09-27T12:00:00.000Z',
    });
  });

  it('keeps the car across turns and adds the resolved template', () => {
    const partial = SessionClient.empty('s1').rememberVehicle({
      entities: { car_brand: 'Toyota', car_model: 'RAV4' },
      fitment: {
        missing: 'year',
        slots: { car_brand: 'Toyota', car_model: 'RAV4' },
      },
    });
    const resolved = partial.rememberVehicle({
      entities: {},
      collectedSlots: {
        car_brand: 'Toyota',
        car_model: 'RAV4',
        year: 2021,
        body_type: 'suv',
      },
      cascadeMatch: 'one',
      verifiedProduct: {
        productId: 'passenger_car|toyota|rav4|2554',
        fields: {
          brand_key: 'Toyota ',
          model_key: 'Rav4 (XA50) 5 gen',
        },
      },
    });

    expect(resolved.data).toMatchObject({
      carBrand: 'Toyota',
      year: 2021,
      bodyType: 'suv',
      cascadeStatus: 'one',
      templateRecordKey: 'passenger_car|toyota|rav4|2554',
      modelKey: 'Rav4 (XA50) 5 gen',
    });
    expect(resolved.data.missingSlot).toBeUndefined();
  });

  it('puts the car into a fitment turn and leaves a color question without it', () => {
    const client = new SessionClient({
      sessionId: 's1',
      contactConsent: true,
      phone: '500600700',
      givenName: 'Anna',
      carBrand: 'Toyota',
      carModel: 'RAV4',
      year: 2021,
      bodyType: 'suv',
      quoteVariant: 'standard',
    });

    const fitment = client.note(
      contextNeedForTurn({
        subIntent: 'fitment',
        execution: { kind: 'workflow', workflow: 'fitment_cascade' },
      }),
    );
    const colors = client.note(
      contextNeedForTurn({
        subIntent: 'available_colors',
        execution: { kind: 'knowledge' },
      }),
    );
    const quote = client.note(
      contextNeedForTurn({
        subIntent: 'indicative_quote',
        execution: { kind: 'workflow', workflow: 'quote_vehicle' },
      }),
    );

    expect(fitment).toContain('marka=Toyota');
    expect(fitment).not.toContain('Anna');
    expect(fitment).not.toContain('500600700');
    expect(colors).toBeUndefined();
    expect(quote).toContain('marka=Toyota');
    expect(quote).toContain('wariant=standard');
    expect(quote).not.toContain('Anna');

    const followUp = client.note(
      contextNeedForTurn({
        intent: 'product_info',
        subIntent: null,
        execution: { kind: 'knowledge' },
      }),
    );
    expect(followUp).toContain('marka=Toyota');
    expect(followUp).not.toContain('Anna');
  });

  it('clears the resolved template when the client names another car', () => {
    const stored = new SessionClient({
      sessionId: 's1',
      contactConsent: false,
      carBrand: 'Toyota',
      templateRecordKey: 'old',
      cascadeStatus: 'one',
    });
    const next = stored.rememberVehicle({
      entities: { car_brand: 'Audi' },
      fitment: { missing: 'car_model', slots: { car_brand: 'Audi' } },
    });

    expect(next.data.carBrand).toBe('Audi');
    expect(next.data.templateRecordKey).toBeUndefined();
    expect(next.data.cascadeStatus).toBe('suspended');
  });

  it('does not treat the whole follow-up sentence as a new brand', () => {
    expect(
      conflictsWithStoredVehicle(
        'juz podalem',
        { car_brand: 'juz podalem' },
        { carBrand: 'Toyota' },
      ),
    ).toBe(false);
    expect(
      shouldRememberQualifierEntities({
        subIntent: null,
        execution: { kind: 'knowledge' },
      }),
    ).toBe(false);
  });
});
