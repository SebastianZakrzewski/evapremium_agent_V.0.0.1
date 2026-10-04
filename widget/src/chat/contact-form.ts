export type ContactFormValues = {
  givenName: string;
  phone: string;
  email: string;
};

export function contactFormMessage(values: ContactFormValues): string | undefined {
  const givenName = values.givenName.trim();
  const email = values.email.trim();
  const phone = readPhone(values.phone);
  if (!/^\p{L}[\p{L}'-]{1,40}$/u.test(givenName) || phone === undefined) {
    return undefined;
  }
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return undefined;
  }
  const base = `Nazywam się ${givenName}, tel. ${phone}`;
  return email === '' ? base : `${base}, ${email}`;
}

function readPhone(text: string): string | undefined {
  const match = text.match(/(?:\+48[\s-]?)?(?:\d[\s-]?){8}\d/u);
  if (!match?.[0]) {
    return undefined;
  }
  const digits = match[0].replace(/\D/g, '');
  const local =
    digits.startsWith('48') && digits.length === 11 ? digits.slice(2) : digits;
  return local.length === 9 ? local : undefined;
}
