import { createLead, type BitrixLeadGateway } from './lead';

class RecordingBitrix implements BitrixLeadGateway {
  readonly calls: Parameters<BitrixLeadGateway['crmLeadAdd']>[] = [];

  crmLeadAdd(
    fields: Parameters<BitrixLeadGateway['crmLeadAdd']>[0],
  ): Promise<{ id: string }> {
    this.calls.push([fields]);
    return Promise.resolve({ id: 'bitrix-1' });
  }
}

describe('createLead', () => {
  const base = {
    sessionId: 'session-1',
    vehicleDescription: 'VW Golf 8 kombi 2021',
    contact: { phone: '+48 793 993 430' },
  };

  it('creates a Bitrix lead when contact and consent are present', async () => {
    const bitrix = new RecordingBitrix();
    const result = await createLead({ ...base, consent: true }, bitrix);

    expect(result).toEqual({ status: 'created', bitrixId: 'bitrix-1' });
    expect(bitrix.calls).toHaveLength(1);
    expect(bitrix.calls[0]?.[0]).toMatchObject({
      TITLE: 'EVA Premium — chat',
      COMMENTS: 'session:session-1\nVW Golf 8 kombi 2021',
      PHONE: [{ VALUE: '+48 793 993 430', VALUE_TYPE: 'WORK' }],
    });
    expect(bitrix.calls[0]?.[0]).not.toHaveProperty('transcript');
  });

  it('does not call crm.lead.add without consent', async () => {
    const bitrix = new RecordingBitrix();
    const result = await createLead({ ...base, consent: false }, bitrix);

    expect(result).toEqual({ status: 'skipped_no_consent' });
    expect(bitrix.calls).toHaveLength(0);
  });

  it('does not call crm.lead.add without phone or email', async () => {
    const bitrix = new RecordingBitrix();
    const result = await createLead(
      { ...base, consent: true, contact: { email: '  ' } },
      bitrix,
    );

    expect(result).toEqual({ status: 'skipped_no_contact' });
    expect(bitrix.calls).toHaveLength(0);
  });
});
