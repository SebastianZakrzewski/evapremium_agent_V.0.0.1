-- Szerszy retrieval_text sluga kolory (77 słów). Body bez zmian.
-- Do not apply to PROD without an explicit go-ahead.
-- Po apply: ponowny ingest embeddingu sluga kolory.

update eva_bot.context_nodes
set retrieval_text = 'jakie kolory dywaników paleta odcieni barwy czarny szary beż czerwony niebieski wybór koloru obwódki lista kolorów czy dywaniki są w różnych kolorach czy macie dywaniki w kolorach jakie kolory macie w ofercie czy są różne kolory dostępność kolorów warianty kolorystyczne jakie odcienie są dostępne czy są dywaniki czarne czy jest kolor beżowy brąz kość słoniowa czy mogę wybrać kolor mata w kolorze lista dostępnych barw czy dywaniki mają kolory jaki kolor dywanika kolory do wyboru barwa obwódki'
where slug = 'kolory';
