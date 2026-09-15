# MVP: agent obsługi klienta

Widget na `evapremium.pl` przez **snippet** ładujący czat z **Vercel/CDN**;
API NestJS na **Hetznerze**. Cel: informacje o produkcie i wycena orientacyjna.
Język agenta w MVP: **tylko polski**.
Nowa sesja: **stałe** powitanie (Nest, bez modelu) i pięć przycisków tematów
w widgecie; klik wysyła gotową wiadomość jak zwykły czat.
Aktualizuj przy zmianie zachowania MVP.

## Aktorzy

- Klient sklepu (czat).
- Agent.
- Pracownik (kolejka w Bitrix24, nie live chat).

## Ścieżka główna — wycena

1. Klient podaje auto (tekst).
2. LLM wyciąga surowe sloty; Nest mapuje aliasami i filtruje szablony kaskadowo.
3. Przy dokładnie jednym szablonie agent pyta o wariant **tylko z opcji
   `pricing_category_variants` dla kategorii tego szablonu**.
4. Po wyborze wariantu (i w razie dual_mat_type: typu maty) podaje **jedną**
   wycenę orientacyjną z `pricing_matrix` i zastrzeżenie, że cena ostateczna
   jest w konfiguratorze / po potwierdzeniu.

## Ścieżka główna — informacja

Pytania o materiał, pielęgnację, dostawę, dopasowanie, gwarancję, montaż itd.
odpowiadane wyłącznie z liścia **context tree** (`eva_bot.context_nodes`).
Bez RAG. Liście `chat-zapis` i `zgoda-lead`: treść wkleja biznes.

## Brak danych

- 0 szablonów: brak ceny; informacja, że skontaktuje się człowiek; **lead w Bitrix24**
  (opis auta + dane kontaktu + odniesienie do sesji w Supabase).
- Wiele szablonów: lista do wyboru; bez ceny aż do jednego rekordu.
- Brak liścia w context tree: brak zmyślonej polityki; analogicznie lead lub
  kontakt — bez halucynacji.

Kontakt sklepu do komunikacji: `+48 793 993 430`.

## Poza MVP

Zamówienie, płatność, zwrot środków, konto klienta, VIN, czat z konsultantem
w czasie rzeczywistym.

## Kryteria akceptacji

- Agent nie podaje kwoty bez jednoznacznego szablonu i wybranego wariantu
  z listy kategorii.
- Agent nie wymyśla faktów spoza context tree.
- Lead w Bitrix24: kontakt + zgoda.
- Zakres szablonów = `evapremium_shop.mat_templates` w PROD.
- Kategorie cennika: passenger_car, minivan, bus, pickup (+ heavy_truck,
  passenger_car_legacy).

Transkrypt: `eva_bot.chat_sessions` / `chat_messages`. Informacja o zapisie
w widgecie; kontakt tylko po zgodzie.