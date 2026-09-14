# Resolver leada (fake HTTP Bitrix)

Kod: `tests/api/lead/lead.resolver.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: REST `crm.lead.add.json` przez fake HTTP; bez zgody brak POST.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| lead-http-001 | critical | POST crm.lead.add przy zgodzie i mailu |
| lead-http-002 | critical | Brak POST gdy domena skipuje |

### lead-http-001 — POST crm.lead.add przy zgodzie i mailu

- **Kod:** `tests/api/lead/lead.resolver.spec.ts` → `it('POSTs crm.lead.add.json only when consent and contact exist')`
- **Krytyczność:** critical
- **Logika:** Nest woła webhook Bitrix, nie panel w repo; pola bez pełnego transkryptu.
- **Wejście:** `consent: true`, `email: 'klient@example.com'`
- **Wyjście:** jeden POST na `.../crm.lead.add.json` z `fields.EMAIL` i `session:` w COMMENTS

### lead-http-002 — Brak POST gdy domena skipuje

- **Kod:** `tests/api/lead/lead.resolver.spec.ts` → `it('does not POST when createLead skips')`
- **Krytyczność:** critical
- **Logika:** skip domeny nie może wyciec jako request HTTP.
- **Wejście:** `consent: false`
- **Wyjście:** `http.requests` puste
