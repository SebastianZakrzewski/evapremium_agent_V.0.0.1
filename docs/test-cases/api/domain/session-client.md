# Profil klienta sesji

Kod: `tests/api/domain/session-client.spec.ts`, `tests/api/chat/session-clients.spec.ts`, `tests/api/chat/mastra-chat.agent.spec.ts`  
Tabela: `supabase/migrations/20260927140000_session_clients.sql` (bez apply na PROD)  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: jedna klasa `SessionClient` na `session_id`. Nest zapisuje fakty
podane przez klienta. Do notatki tury wchodzi tylko wycinek potrzebny tej
odpowiedzi.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| client-001 | high | Imię, kontakt i zgoda ze zdania |
| client-002 | critical | Auto zostaje, szablon dochodzi przy one |
| client-003 | critical | Dobór i wycena dostają auto, kolor nie |
| client-004 | high | Inne auto czyści klucz szablonu |
| client-006 | high | Całe zdanie nie jest nową marką |
| client-005 | high | Jeden wiersz w store na sesję |
| chat-mastra-002 | high | Agent dokleja auto tylko gdy tura go potrzebuje |

### client-001 — Imię, kontakt i zgoda ze zdania

- **Kod:** `tests/api/domain/session-client.spec.ts` → `it('stores a name, contact and consent from the client utterance')`
- **Krytyczność:** high
- **Logika:** imię, nazwisko, telefon, mail i zgoda zapisują się tylko wtedy, gdy klient je wypowie. Zgoda dostaje znacznik czasu.
- **Wejście:** „Nazywam się Anna Kowalska, tel. 500600700, anna@example.com, wyrażam zgodę”
- **Wyjście:** `givenName=Anna`, `familyName=Kowalska`, telefon bez spacji, email, `contactConsent=true`, `consentAt` z argumentu

### client-002 — Auto zostaje, szablon dochodzi przy one

- **Kod:** `tests/api/domain/session-client.spec.ts` → `it('keeps the car across turns and adds the resolved template')`
- **Krytyczność:** critical
- **Logika:** sloty z dopytywania zostają. Przy `one` dochodzi `recordKey` i klucze katalogu, a `missingSlot` schodzi.
- **Wejście:** najpierw marka i model z brakującym rokiem, potem komplet slotów i `verifiedProduct`
- **Wyjście:** `year=2021`, `cascadeStatus=one`, `templateRecordKey` z produktu, bez `missingSlot`

### client-003 — Dobór i wycena dostają auto, kolor nie

- **Kod:** `tests/api/domain/session-client.spec.ts` → `it('puts the car into a fitment turn and leaves a color question without it')`
- **Krytyczność:** critical
- **Logika:** profil jest w bazie zawsze. Do odpowiedzi idzie auto przy `fitment` i `indicative_quote`. Pytanie o kolory nie dostaje ani auta, ani telefonu, ani imienia.
- **Wejście:** pełny profil (Anna, telefon, Toyota RAV4 2021 SUV, wariant standard)
- **Wyjście:** notatka doboru zawiera `marka=Toyota` i nie zawiera `Anna` ani numeru; kolory → `undefined`; wycena zawiera auto i `wariant=standard`

### client-004 — Inne auto czyści klucz szablonu

- **Kod:** `tests/api/domain/session-client.spec.ts` → `it('clears the resolved template when the client names another car')`
- **Krytyczność:** high
- **Logika:** nowa marka unieważnia poprzedni `recordKey`, dopóki kaskada nie policzy nowego auta.
- **Wejście:** zapis Toyota z `templateRecordKey=old`, potem slot `car_brand=Audi`
- **Wyjście:** `carBrand=Audi`, brak `templateRecordKey`, `cascadeStatus=suspended`

### client-006 — Całe zdanie nie jest nową marką

- **Kod:** `tests/api/domain/session-client.spec.ts` → `it('does not treat the whole follow-up sentence as a new brand')`
- **Krytyczność:** high
- **Logika:** „już podałem” nie jest inną marką i nie jest turą, z której wolno zapisać encje kwalifikatora.
- **Wejście:** wiadomość `juz podalem`, encja `car_brand=juz podalem`, zapisana marka Toyota; tura `knowledge` bez sub-intencji
- **Wyjście:** brak konfliktu z zapisanym autem; encje kwalifikatora nie są zapamiętywane

### client-003 uzupełnienie — dalszy ciąg product_info

- **Kod:** `tests/api/domain/session-client.spec.ts` → `it('puts the car into a fitment turn and leaves a color question without it')`
- **Krytyczność:** critical
- **Logika:** `product_info` bez sub-intencji (na przykład „i jak?”) dostaje auto. Kolor nadal nie.
- **Wejście:** profil Toyoty, tura `intent=product_info`, `subIntent=null`
- **Wyjście:** notatka zawiera `marka=Toyota` i nie zawiera imienia


### client-005 — Jeden wiersz w store na sesję

- **Kod:** `tests/api/chat/session-clients.spec.ts` → `it('keeps a single row when the same session is saved twice')`
- **Krytyczność:** high
- **Logika:** `session_id` jest kluczem. Drugi zapis nadpisuje wiersz, nie dokłada kopii.
- **Wejście:** dwa `save` dla `session-1`, najpierw Toyota, potem Audi
- **Wyjście:** jeden wiersz, `car_brand=Audi`

### chat-mastra-002 — Agent dokleja auto tylko gdy tura go potrzebuje

- **Kod:** `tests/api/chat/mastra-chat.agent.spec.ts` → `it('adds the stored car only on a turn that fits or prices the vehicle')`
- **Krytyczność:** high
- **Logika:** po zapisie marki pytanie o kolory nie dostaje `marka=` w `executionNote`. Kolejne pytanie o dopasowanie bez nazwy auta dostaje zapisaną markę.
- **Wejście:** „Czy pasują dywaniki do Toyota?”, potem „Jakie macie kolory?”, potem „Czy pasują dywaniki?”
- **Wyjście:** notatka kolorów bez `marka=Toyota`; trzecia notatka z `marka=Toyota`; rekord sesji ma `carBrand=Toyota`
