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
- Karta pojawia się w oknie dopiero po jednym szablonie (marka i model). Adres karty jest ze sklepu (`cardUrl`).
- Skrypt ładuje się z originu widgetu. Adres skryptu jest adresem czatu.
- `data-eva-widget` to publiczne id, nie sekret.

## Działanie

1. Strona ustawia `window.widgetPlugin`, potem ładuje `widget-plugin.js`.
2. Skrypt czyta `data-eva-widget` i `window.widgetPlugin`. Brak obiektu to pusta konfiguracja.
3. Poprawna konfiguracja wstawia obok skryptu iframe czatu: origin skryptu plus `?widget=<id>`.
4. Przy `showProduct` do query dochodzą `productId` i `cardUrl`. Te same wartości są na hoście jako `data-eva-product-id` i `data-eva-card-url`.
5. Puste `productId`, adres inny niż `https` albo nie-URL: iframe się nie pojawia.
6. Pusta konfiguracja montuje sam czat.
7. Gdy agent potwierdzi markę i model, czat otwiera okno sklepu
   `/dywaniki?brand={slug}`. To strona z `CarModelsSection`
   (`src/components/car-models-section.tsx`), nie osobny komponent karty.
   Slug marki trafia w `searchParams.brand` (`bmw` → `/dywaniki?brand=bmw`).
   Jedno okno modelu w siatce to `<article>` w `filteredModels.map`.
   Filtrów, `ModelNavigationBar` i wyboru marki bez `?brand=` nie ruszać przy
   zmianie samej karty.

## Konfiguracja

```ts
type WidgetConfig = {
  showProduct?: {
    productId: string;
    cardUrl: string;
  };
};
```

| Pole | Znaczenie |
| --- | --- |
| `showProduct` | Opcjonalne. Karta produktu tego serwisu. Brak pola zostawia sam czat. |
| `showProduct.productId` | Publiczny identyfikator produktu. Po obcięciu białych znaków nie może być pusty. |
| `showProduct.cardUrl` | Adres `https` okna sklepu. `{brand}` to slug w `/dywaniki?brand=`. |

```html
<script>
  window.widgetPlugin = {
    showProduct: {
      productId: 'audi-a4',
      cardUrl: 'https://sklep.example/dywaniki?brand={brand}',
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
