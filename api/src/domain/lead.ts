export type LeadContact = {
  email?: string;
  phone?: string;
};

export type CreateLeadInput = {
  sessionId: string;
  consent: boolean;
  contact: LeadContact;
  vehicleDescription: string;
};

export type CreateLeadResult =
  | { status: 'created'; bitrixId: string }
  | { status: 'skipped_no_consent' }
  | { status: 'skipped_no_contact' };

export type BitrixLeadFields = {
  TITLE: string;
  COMMENTS: string;
  PHONE?: { VALUE: string; VALUE_TYPE: 'WORK' }[];
  EMAIL?: { VALUE: string; VALUE_TYPE: 'WORK' }[];
};

export interface BitrixLeadGateway {
  crmLeadAdd(fields: BitrixLeadFields): Promise<{ id: string }>;
}

export function hasLeadContact(contact: LeadContact): boolean {
  const email = contact.email?.trim();
  const phone = contact.phone?.trim();
  return Boolean(email) || Boolean(phone);
}

export async function createLead(
  input: CreateLeadInput,
  bitrix: BitrixLeadGateway,
): Promise<CreateLeadResult> {
  if (!input.consent) {
    return { status: 'skipped_no_consent' };
  }
  if (!hasLeadContact(input.contact)) {
    return { status: 'skipped_no_contact' };
  }

  const fields: BitrixLeadFields = {
    TITLE: 'EVA Premium — chat',
    COMMENTS: `session:${input.sessionId}\n${input.vehicleDescription}`,
  };
  const phone = input.contact.phone?.trim();
  const email = input.contact.email?.trim();
  if (phone) {
    fields.PHONE = [{ VALUE: phone, VALUE_TYPE: 'WORK' }];
  }
  if (email) {
    fields.EMAIL = [{ VALUE: email, VALUE_TYPE: 'WORK' }];
  }

  const { id } = await bitrix.crmLeadAdd(fields);
  return { status: 'created', bitrixId: id };
}
