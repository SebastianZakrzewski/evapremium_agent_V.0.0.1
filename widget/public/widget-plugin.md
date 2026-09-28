# Wtyczka widgetu

Inny projekt pobiera ten plik z GitHuba, bez kopiowania do swojego
repozytorium:

`https://raw.githubusercontent.com/SebastianZakrzewski/evapremium_agent_V.0.0.1/main/widget/public/widget-plugin.md`

Skrót odpalenia jest w opisie repozytorium na GitHubie. Na originie widgetu
ten plik jest też pod adresem `/widget-plugin.md`.

Źródło prawdy granic w repozytorium wtyczki: sekcja Widget w `ARCHITECTURE.md`.

## Dla agenta

- Serwis wypełnia `window.widgetPlugin`. Nie kopiuj widoku karty do widgetu.
- Jedno pole domeny: `showProduct`. Nie dodawaj tytułu, ceny ani HTML karty.
- `mountObject` jest ogólnym portem renderowania. Argument to `id` i słownik `fields`. Nie nazywaj w tym kontrakcie pól auta.
- Karta pojawia się w oknie dopiero po jednym szablonie. Adres karty jest ze sklepu (`cardUrl`). Token `{nazwa}` widget wypełnia wartością z pól dopasowanego wiersza. `{productId}` to klucz rekordu. Widget nie nazywa tych pól. Zostawiona klamra nie otwiera okna.
- Skrypt ładuje się z originu widgetu. Adres skryptu jest adresem czatu.
- `data-eva-widget` to publiczne id, nie sekret.

## Działanie

1. Strona ustawia `window.widgetPlugin`, potem ładuje `widget-plugin.js`.
2. Skrypt czyta `data-eva-widget` i `window.widgetPlugin`. Brak obiektu to pusta konfiguracja.
3. Poprawna konfiguracja wstawia obok skryptu iframe czatu: origin skryptu plus `?widget=<id>`.
4. Przy `showProduct` do query dochodzą `productId` i `cardUrl`. Te same wartości są na hoście jako `data-eva-product-id` i `data-eva-card-url`.
5. Puste `productId`, adres inny niż `https` albo nie-URL: iframe się nie pojawia.
6. Pusta konfiguracja montuje sam czat.
7. Gdy kaskada wskaże jeden szablon, czat otwiera iframe pod `cardUrl` po wypełnieniu tokenów. Nazwy w klamrach należą do sklepu. Niedopełniony adres nie otwiera okna.

## Konfiguracja

```ts
type MountedObject = {
  id: string;
  fields: Record<string, string>;
};

type WidgetConfig = {
  showProduct?: {
    productId: string;
    cardUrl: string;
  };
  mountObject?: (
    object: MountedObject,
    host: HTMLElement,
  ) => void | (() => void);
};

type EvaObjectMessage = {
  source: 'eva-widget';
  type: 'eva.object';
  object: MountedObject | null;
};
```

| Pole | Znaczenie |
| --- | --- |
| `showProduct` | Opcjonalne. Karta produktu tego serwisu. Brak pola zostawia sam czat. |
| `showProduct.productId` | Publiczny identyfikator produktu. Po obcięciu białych znaków nie może być pusty. |
| `showProduct.cardUrl` | Adres `https` okna sklepu. `{productId}` to klucz rekordu. Każdy inny `{token}` pochodzi z pól wiersza. Zostawiona klamra nie otwiera okna. |
| `mountObject` | Opcjonalne. Sklep renderuje własny obiekt w `host` obok czatu. Brak metody zostawia sam czat. |
| `MountedObject.id` | Identyfikator obiektu. Po obcięciu białych znaków nie może być pusty. Widget nie interpretuje tej wartości. |
| `MountedObject.fields` | Słownik napisów. Klucze należą do sklepu. Widget ich nie nazywa i nie odrzuca. |
| wartość zwrotna | Opcjonalne sprzątanie. Widget woła je przed kolejnym obiektem i przy `object: null`. |
| `EvaObjectMessage` | Komunikat z iframe czatu do strony sklepu. `object: null` zdejmuje widok. Inny `source` albo `type` jest ignorowany. |

```html
<script>
  window.widgetPlugin = {
    showProduct: {
      productId: 'audi-a4',
      cardUrl: 'https://sklep.example/modele?brand={brand_key}&model={model_family_key}&generation={generation}&bodyType={body_type_key}',
    },
  };
</script>
<script
  src="https://<origin-widgetu>/widget-plugin.js"
  data-eva-widget="eva-shop"
  async
></script>
```

Obiekt konfiguracji ustaw przed skryptem. Widget nie definiuje wyglądu karty.
