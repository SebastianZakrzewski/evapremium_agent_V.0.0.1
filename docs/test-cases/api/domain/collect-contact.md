# Zbieranie kontaktu przy wycenie

Kod: `tests/api/domain/collect-contact.spec.ts`

Logika zestawu: przy `pricing` / `indicative_quote` tool `collect-contact`
uruchamia proces. Wymagane są imię i telefon. E-mail jest opcjonalny.
Zapis idzie do `eva_bot.session_clients`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| contact-001 | high | Najpierw imię, potem telefon, e-mail opcjonalny |
| contact-002 | high | Odpowiedź o aucie nie jest imieniem |
| contact-003 | high | Po aucie krótka odpowiedź wznawia kontakt |
| contact-004 | critical | Tool zapisuje imię, telefon i e-mail |

### contact-001 — Najpierw imię, potem telefon, e-mail opcjonalny

- **Kod:** `tests/api/domain/collect-contact.spec.ts` → `it('asks for a name, then a phone, and keeps an optional email')`
- **Krytyczność:** high
- **Logika:** Pusty start czeka na imię. Samo imię nie kończy procesu. Telefon domyka wymagane pola, a mail dokleja się, gdy jest w odpowiedzi.
- **Wejście:** puste sloty, potem `Anna`, potem `anna@example.com 500 600 700`
- **Wyjście:** `waiting` / `given_name`, potem `waiting` / `phone`, na końcu `ready` z imieniem, telefonem bez spacji i e-mailem

### contact-002 — Odpowiedź o aucie nie jest imieniem

- **Kod:** `tests/api/domain/collect-contact.spec.ts` → `it('does not treat a vehicle reply as a name while the quote workflow is open')`
- **Krytyczność:** high
- **Logika:** Otwarta wycena auta bierze krótką odpowiedź jako slot auta. Proces kontaktu zostaje na imieniu.
- **Wejście:** `Ile kosztują dywaniki?`, potem `Volkswagen`
- **Wyjście:** marka `Volkswagen`, kontakt nadal bez imienia

### contact-003 — Po aucie krótka odpowiedź wznawia kontakt

- **Kod:** `tests/api/domain/collect-contact.spec.ts` → `it('resumes contact collection after the vehicle slots are done')`
- **Krytyczność:** high
- **Logika:** Gdy nie ma otwartego slotu auta, krótka odpowiedź uzupełnia imię i zostawia tool `collect-contact`.
- **Wejście:** otwarty kontakt bez imienia, wiadomość `Anna`
- **Wyjście:** `pricing`, tool `collect-contact`, brakuje telefonu, slot `givenName=Anna`

### contact-004 — Tool zapisuje imię, telefon i e-mail

- **Kod:** `tests/api/domain/collect-contact.spec.ts` → `it('persists the name and phone through the shop tool')`
- **Krytyczność:** critical
- **Logika:** `collect-contact` scala nowe pola z wierszem sesji i zapisuje je w `session_clients`.
- **Wejście:** imię `Anna`, potem telefon `500600700` i `anna@example.com`
- **Wyjście:** status `saved` i ten sam kontakt w store sesji
