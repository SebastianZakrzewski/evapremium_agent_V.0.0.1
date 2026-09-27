import { SupabaseSessionClients } from '@api/chat/session-clients';
import { SessionClient } from '@api/domain/session-client';
import { MemoryDataStore } from '@api/supabase/data-store';

describe('supabase session clients', () => {
  it('upserts one row per session and reads it back', async () => {
    const store = new MemoryDataStore();
    const clients = new SupabaseSessionClients(store);
    const first = SessionClient.empty('session-1').rememberUtterance(
      'Mam na imię Anna',
      '2026-09-27T12:00:00.000Z',
    );
    await clients.save(first);
    await clients.save(
      first.rememberVehicle({
        entities: { car_brand: 'Toyota', car_model: 'RAV4' },
      }),
    );

    const stored = await clients.get('session-1');
    expect(stored?.data).toMatchObject({
      sessionId: 'session-1',
      givenName: 'Anna',
      carBrand: 'Toyota',
      carModel: 'RAV4',
      contactConsent: false,
    });
    const rows = await store.selectAll('eva_bot', 'session_clients');
    expect(rows).toHaveLength(1);
  });

  it('keeps a single row when the same session is saved twice', async () => {
    const store = new MemoryDataStore();
    const clients = new SupabaseSessionClients(store);
    const client = new SessionClient({
      sessionId: 'session-1',
      contactConsent: false,
      carBrand: 'Toyota',
    });
    await clients.save(client);
    await clients.save(
      new SessionClient({
        sessionId: 'session-1',
        contactConsent: false,
        carBrand: 'Audi',
      }),
    );

    const rows = await store.selectAll<{ session_id: string; car_brand: string }>(
      'eva_bot',
      'session_clients',
    );
    expect(rows).toEqual([
      expect.objectContaining({ session_id: 'session-1', car_brand: 'Audi' }),
    ]);
  });
});
