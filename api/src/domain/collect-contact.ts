import { isSlotReply } from './quote-vehicle';

export const COLLECT_CONTACT_WORKFLOW = 'collect_contact';
export const COLLECT_CONTACT_TOOL = 'collect-contact';

export type ContactSlotKey = 'given_name' | 'phone';

export type ContactSlots = {
  givenName?: string;
  phone?: string;
  email?: string;
};

export type ContactWorkflowSnapshot = {
  workflow: typeof COLLECT_CONTACT_WORKFLOW;
  step: 'waiting_for_contact';
  missing: ContactSlotKey;
  slots: ContactSlots;
};

export type ContactAdvance =
  | {
      status: 'suspended';
      missing: ContactSlotKey;
      snapshot: ContactWorkflowSnapshot;
    }
  | {
      status: 'ready';
      slots: ContactSlots;
      tool: typeof COLLECT_CONTACT_TOOL;
    };

const SLOT_ORDER: readonly ContactSlotKey[] = ['given_name', 'phone'];

const EXPLICIT_NAME =
  /(?:nazywam się|mam na imię)\s+(\p{L}[\p{L}'-]+)/iu;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const NAME_REPLY = /^\p{L}[\p{L}'-]{1,40}$/u;

export function advanceContactCollection(input: {
  slots?: ContactSlots;
  message?: string;
  asked?: ContactSlotKey;
}): ContactAdvance {
  const slots = readContactSlots(input.slots ?? {}, input.message, input.asked);
  const missing = SLOT_ORDER.find((key) => !slotPresent(slots, key));
  if (missing !== undefined) {
    return {
      status: 'suspended',
      missing,
      snapshot: {
        workflow: COLLECT_CONTACT_WORKFLOW,
        step: 'waiting_for_contact',
        missing,
        slots,
      },
    };
  }
  return {
    status: 'ready',
    slots,
    tool: COLLECT_CONTACT_TOOL,
  };
}

export function normalizeContactInput(input: ContactSlots): ContactSlots {
  const givenName = input.givenName?.trim();
  const email = input.email?.match(EMAIL_PATTERN)?.[0];
  return filled({
    givenName:
      givenName !== undefined && NAME_REPLY.test(givenName)
        ? givenName
        : undefined,
    phone: input.phone === undefined ? undefined : readPhone(input.phone),
    email,
  });
}

export function contactSlotsFromClient(data: {
  givenName?: string;
  phone?: string;
  email?: string;
}): ContactSlots {
  return filled({
    givenName: data.givenName,
    phone: data.phone,
    email: data.email,
  });
}

function readContactSlots(
  current: ContactSlots,
  message: string | undefined,
  asked: ContactSlotKey | undefined,
): ContactSlots {
  const next = filled(current);
  if (message === undefined || message.trim() === '') {
    return next;
  }
  const email = message.match(EMAIL_PATTERN)?.[0];
  if (email) {
    next.email = email;
  }
  const phone = readPhone(message);
  if (phone) {
    next.phone = phone;
  }
  const explicit = message.match(EXPLICIT_NAME)?.[1];
  if (explicit) {
    next.givenName = explicit;
  }
  if (!isSlotReply(message)) {
    return filled(next);
  }
  if (asked === 'given_name' && next.givenName === undefined && NAME_REPLY.test(message.trim())) {
    next.givenName = message.trim();
  }
  if (asked === 'phone' && next.phone === undefined) {
    const askedPhone = readPhone(message);
    if (askedPhone) {
      next.phone = askedPhone;
    }
  }
  return filled(next);
}

export function readPhone(text: string): string | undefined {
  const match = text.match(/(?:\+48[\s-]?)?(?:\d[\s-]?){8}\d/u);
  if (!match?.[0]) {
    return undefined;
  }
  const digits = match[0].replace(/\D/g, '');
  const local =
    digits.startsWith('48') && digits.length === 11 ? digits.slice(2) : digits;
  return local.length === 9 ? local : undefined;
}

function slotPresent(slots: ContactSlots, key: ContactSlotKey): boolean {
  if (key === 'given_name') {
    return Boolean(slots.givenName?.trim());
  }
  return Boolean(slots.phone?.trim());
}

function filled(slots: ContactSlots): ContactSlots {
  const next: ContactSlots = {};
  const givenName = slots.givenName?.trim();
  const phone = slots.phone?.trim();
  const email = slots.email?.trim();
  if (givenName) {
    next.givenName = givenName;
  }
  if (phone) {
    next.phone = phone;
  }
  if (email) {
    next.email = email;
  }
  return next;
}
