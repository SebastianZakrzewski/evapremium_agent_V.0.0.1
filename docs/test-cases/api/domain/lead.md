# Lead Bitrix (domena)

Kod: `api/src/domain/lead.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: `crm.lead.add` tylko przy kontakcie (telefon lub e-mail) **oraz**
zgodzie. Transkrypt nie idzie do CRM.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| lead-001 | critical | Kontakt + zgoda → lead |
| lead-002 | critical | Bez zgody brak wywołania Bitrix |
| lead-003 | critical | Bez telefonu i maila brak wywołania Bitrix |

### lead-001 — Kontakt + zgoda → lead

- **Kod:** `api/src/domain/lead.spec.ts` → `it('creates a Bitrix lead when contact and consent are present')`
- **Krytyczność:** critical
- **Logika:** kolejka człowieka powstaje tylko przy obietnicy kontaktu.
- **Wejście:** `consent: true`, `phone: '+48 793 993 430'`, `sessionId`, opis auta
- **Wyjście:** `{ status: 'created', bitrixId: 'bitrix-1' }`; COMMENTS z id sesji, bez transkryptu

### lead-002 — Bez zgody brak wywołania Bitrix

- **Kod:** `api/src/domain/lead.spec.ts` → `it('does not call crm.lead.add without consent')`
- **Krytyczność:** critical
- **Logika:** zgoda jest bramką; nie zapisujemy leada „na wszelki wypadek”.
- **Wejście:** `consent: false`, ten sam kontakt
- **Wyjście:** `{ status: 'skipped_no_consent' }`, zero wywołań bramki

### lead-003 — Bez telefonu i maila brak wywołania Bitrix

- **Kod:** `api/src/domain/lead.spec.ts` → `it('does not call crm.lead.add without phone or email')`
- **Krytyczność:** critical
- **Logika:** pusty kontakt nie jest leadem.
- **Wejście:** `consent: true`, `email: '  '`
- **Wyjście:** `{ status: 'skipped_no_contact' }`, zero wywołań
