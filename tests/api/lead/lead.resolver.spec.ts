import { createLead } from '@api/domain/lead';
import { BitrixLeadClient, FakeBitrixHttp } from '@api/lead/fake-bitrix-http';
import { LeadResolver } from '@api/lead/lead.resolver';

describe('LeadResolver + FakeBitrixHttp', () => {
  it('POSTs crm.lead.add.json only when consent and contact exist', async () => {
    const http = new FakeBitrixHttp();
    const resolver = new LeadResolver(
      new BitrixLeadClient(http, 'https://example.bitrix24.pl/rest/1/fake'),
    );

    await resolver.create({
      sessionId: 'session-1',
      consent: true,
      contact: { email: 'klient@example.com' },
      vehicleDescription: 'brak szablonu',
    });

    expect(http.requests).toEqual([
      {
        method: 'POST',
        url: 'https://example.bitrix24.pl/rest/1/fake/crm.lead.add.json',
        body: {
          fields: {
            TITLE: 'EVA Premium — chat',
            COMMENTS: 'session:session-1\nbrak szablonu',
            EMAIL: [{ VALUE: 'klient@example.com', VALUE_TYPE: 'WORK' }],
          },
        },
      },
    ]);
  });

  it('does not POST when createLead skips', async () => {
    const http = new FakeBitrixHttp();
    const bitrix = new BitrixLeadClient(http, 'https://example.bitrix24.pl/rest/1/fake');
    await createLead(
      {
        sessionId: 'session-1',
        consent: false,
        contact: { email: 'klient@example.com' },
        vehicleDescription: 'brak szablonu',
      },
      bitrix,
    );
    expect(http.requests).toHaveLength(0);
  });
});
