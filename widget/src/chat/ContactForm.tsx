import { useState } from 'react';
import { contactFormMessage } from './contact-form';

type ContactFormProps = {
  disabled: boolean;
  onSubmit: (message: string) => void;
};

export function ContactForm({ disabled, onSubmit }: ContactFormProps) {
  const [givenName, setGivenName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const message = contactFormMessage({ givenName, phone, email });

  return (
    <form
      className="eva-contact"
      aria-label="Dane kontaktowe"
      onSubmit={(event) => {
        event.preventDefault();
        if (message === undefined || disabled) {
          return;
        }
        onSubmit(message);
      }}
    >
      <label className="eva-contact__field">
        Imię
        <input
          name="givenName"
          autoComplete="given-name"
          value={givenName}
          disabled={disabled}
          onChange={(event) => setGivenName(event.target.value)}
        />
      </label>
      <label className="eva-contact__field">
        Numer kontaktowy
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          disabled={disabled}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <label className="eva-contact__field">
        <span>
          Adres e-mail
          <span className="eva-contact__optional">opcjonalnie</span>
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={disabled}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <button className="eva-contact__submit" type="submit" disabled={disabled || message === undefined}>
        Wyślij kontakt
      </button>
    </form>
  );
}
