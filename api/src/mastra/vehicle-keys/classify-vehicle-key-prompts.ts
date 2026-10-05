export const VEHICLE_KEY_CLASSIFIER_INSTRUCTIONS = `Klasyfikujesz jedno pole katalogu według zadania w wiadomości.

Klucz przepisujesz dokładnie z listy kandydatów w tej wiadomości. Nie układasz własnego napisu. Nie dodajesz zdania do klienta. Cała odpowiedź to obiekt zgodny ze schematem tego wywołania.`;

const BRAND_KEY_CLASSIFIER_INSTRUCTIONS = `Wybierasz jedną markę z listy kandydatów dla słów klienta. Lista kandydatów jest niżej. Oddajesz wyłącznie brandKey z tej listy.

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

const MODEL_KEY_CLASSIFIER_INSTRUCTIONS = `Wybierasz modele z listy kandydatów dla słów klienta. Marka jest już wybrana. Lista kandydatów jest niżej. Oddajesz wyłącznie modelKeys z tej listy.

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

const BODY_KEY_CLASSIFIER_INSTRUCTIONS = `Wybierasz jeden typ nadwozia z listy kandydatów dla słów klienta. Lista kandydatów jest niżej. Oddajesz wyłącznie bodyTypeKey z tej listy.

Klucz musi być napisany tak samo jak na liście. Synonim, polska nazwa i literówka liczą się tylko wtedy, gdy ten typ jest na liście. Nie układasz własnego napisu.

# Steps

1. Porównaj nadwozie klienta z kandydatami.
2. Gdy jedno jest tym samym typem, wybierz je. Na przykład SUV i crossover to ten sam typ, gdy na liście jest suv.
3. Gdy żaden nie pasuje, bodyTypeKey jest null.

Najpierw porównaj. bodyTypeKey jest wnioskiem i stoi na końcu odpowiedzi.

# Output Format

Cała odpowiedź to jeden obiekt JSON, bez tekstu przed nim i po nim.

- bodyTypeKey: string równy jednemu kandydatowi, albo null.

# Examples

Input: nadwozie klienta SUV. Kandydaci: hatchback, wagon, suv.
SUV jest typem suv z listy.
{"bodyTypeKey":"suv"}

Input: nadwozie klienta kabriolet. Kandydaci: hatchback, wagon.
Na liście nie ma kabrioletu.
{"bodyTypeKey":null}`;

const GENERATION_KEY_CLASSIFIER_INSTRUCTIONS = `Wybierasz jedną generację z listy kandydatów dla słów klienta. Lista kandydatów jest niżej. Oddajesz wyłącznie generationKey z tej listy.

Klucz musi być napisany tak samo jak na liście. Nie układasz własnego napisu.

# Steps

1. Porównaj słowa klienta z kandydatami.
2. Cyfra, zapis rzymski i słowa w rodzaju „po lifcie” albo „przed liftem” wskazują kandydata, który to samo mówi.
3. Gdy żaden nie pasuje, generationKey jest null.

Najpierw porównaj. generationKey jest wnioskiem i stoi na końcu odpowiedzi.

# Output Format

Cała odpowiedź to jeden obiekt JSON, bez tekstu przed nim i po nim.

- generationKey: string równy jednemu kandydatowi, albo null.

# Examples

Input: generacja klienta po lifcie. Kandydaci: 7 gen, 8 gen.
Po lifcie nie rozstrzyga między 7 gen a 8 gen.
{"generationKey":null}

Input: generacja klienta ósma. Kandydaci: 7 gen, 8 gen.
Ósma jest 8 gen z listy.
{"generationKey":"8 gen"}`;

function withTask(task: string, body: string): string {
  return `${task}\n\n${body}`;
}

export function brandClassificationMessage(
  customerBrand: string,
  brandKeys: string[],
): string {
  return withTask(
    BRAND_KEY_CLASSIFIER_INSTRUCTIONS,
    `marka klienta: ${customerBrand}\nkandydaci:\n${brandKeys.map((key) => `- ${key}`).join('\n')}`,
  );
}

export function modelClassificationMessage(
  customerModel: string,
  modelKeys: string[],
  year?: number,
): string {
  const yearLine = typeof year === 'number' ? `\nrok klienta: ${year}` : '';
  return withTask(
    MODEL_KEY_CLASSIFIER_INSTRUCTIONS,
    `model klienta: ${customerModel}${yearLine}\nkandydaci:\n${modelKeys.map((key) => `- ${key}`).join('\n')}`,
  );
}

export function bodyClassificationMessage(customerBody: string, bodyKeys: string[]): string {
  return withTask(
    BODY_KEY_CLASSIFIER_INSTRUCTIONS,
    `nadwozie klienta: ${customerBody}\nkandydaci:\n${bodyKeys.map((key) => `- ${key}`).join('\n')}`,
  );
}

export function generationClassificationMessage(
  customerGeneration: string,
  generationKeys: string[],
): string {
  return withTask(
    GENERATION_KEY_CLASSIFIER_INSTRUCTIONS,
    `generacja klienta: ${customerGeneration}\nkandydaci:\n${generationKeys.map((key) => `- ${key}`).join('\n')}`,
  );
}
