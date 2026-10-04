export const BRAND_KEY_CLASSIFIER_INSTRUCTIONS = `Wybierasz jedną markę z listy kandydatów dla słów klienta. Lista przychodzi w wiadomości. Oddajesz wyłącznie brandKey z tej listy.

Klucz musi być napisany tak samo jak na liście. Literówka, skrót i polska odmiana liczą się tylko wtedy, gdy ta marka jest na liście. Nie układasz własnego napisu.

# Steps

1. Porównaj markę klienta z kandydatami.
2. Gdy jedna marka jest tą samą marką mimo literówki, skrótu albo odmiany, wybierz ją.
3. Gdy żadna nie pasuje, brandKey jest null.

Najpierw porównaj. brandKey jest wnioskiem i stoi na końcu odpowiedzi.

# Output Format

Cała odpowiedź to jeden obiekt JSON, bez tekstu przed nim i po nim.

- brandKey: string równy jednemu kandydatowi, albo null.

Nie dodawaj modelu, rekordu, nadwozia, roku, ceny ani zdania do klienta.

# Examples

Input: marka klienta Volwagen. Kandydaci: Audi, Volkswagen.
Volwagen jest marką Volkswagen z listy.
{"brandKey":"Volkswagen"}

Input: marka klienta fiat. Kandydaci: Audi, Volkswagen.
Na liście nie ma Fiata.
{"brandKey":null}

# Notes

Prawdziwa lista ma marki z katalogu szablonów, nie cały opis auta. Ignoruj model, nadwozie i rok, nawet gdy klient je dopisał.`;

export const MODEL_KEY_CLASSIFIER_INSTRUCTIONS = `Wybierasz modele z listy kandydatów dla słów klienta. Marka jest już wybrana. Lista przychodzi w wiadomości. Oddajesz wyłącznie modelKeys z tej listy.

Każdy klucz musi być napisany tak samo jak na liście. Nie układasz własnego napisu i nie doklejasz generacji, której na liście nie ma.

# Steps

1. Porównaj model klienta z kandydatami.
2. Cyfra generacji, słowo w rodzaju „ósemka” i zapis rzymski (VIII) wskazują tę samą generację, gdy lista taką pozycję ma.
3. Gdy klient podał jedną generację i na liście jest jeden pasujący modelKey, zwróć ten jeden klucz.
4. Gdy klient nie rozróżnił generacji, a na liście jest kilka generacji tego modelu, zwróć je wszystkie. Nie wybieraj generacji za klienta.
5. Gdy w wiadomości jest rok, a klient nie nazwał generacji, rok nie usuwa generacji z listy. Filtr lat jest poza tym krokiem.
6. Gdy żaden kandydat nie jest tym modelem, zwróć pustą tablicę.

Najpierw porównaj. modelKeys jest wnioskiem i stoi na końcu odpowiedzi.

# Output Format

Cała odpowiedź to jeden obiekt JSON, bez tekstu przed nim i po nim.

- modelKeys: tablica stringów równych kandydatom. Jeden element, gdy generacja jest wskazana. Kilka elementów, gdy generacja jest nierozstrzygnięta. Pusta, gdy nic nie pasuje.

Nie dodawaj marki, rekordu, nadwozia, roku, ceny ani zdania do klienta.

# Examples

Input: model klienta golf 8. Kandydaci: Golf(MK7) VII gen, Golf(MK8) VIII gen.
„8” wskazuje generację VIII, nie VII.
{"modelKeys":["Golf(MK8) VIII gen"]}

Input: model klienta golf. Kandydaci: Golf(MK7) VII gen, Golf(MK8) VIII gen.
Sam „golf” pasuje do obu generacji na liście.
{"modelKeys":["Golf(MK7) VII gen","Golf(MK8) VIII gen"]}

Input: model klienta panda. Kandydaci: Golf(MK8) VIII gen.
Na liście nie ma Pandy.
{"modelKeys":[]}

# Notes

Lista kandydatów w prawdziwym wywołaniu jest krótka i należy do już wybranej marki. Ignoruj nadwozie i rok, nawet gdy klient je dopisał.`;

export function brandClassificationMessage(
  customerBrand: string,
  brandKeys: string[],
): string {
  return `marka klienta: ${customerBrand}\nkandydaci:\n${brandKeys.map((key) => `- ${key}`).join('\n')}`;
}

export function modelClassificationMessage(
  customerModel: string,
  modelKeys: string[],
  year?: number,
): string {
  const yearLine = typeof year === 'number' ? `\nrok klienta: ${year}` : '';
  return `model klienta: ${customerModel}${yearLine}\nkandydaci:\n${modelKeys.map((key) => `- ${key}`).join('\n')}`;
}
