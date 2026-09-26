# evapremium_agent_V.0.0.1

Czat osadzany w innym serwisie. Inny projekt pobiera ten opis z GitHuba.
Skryptu `widget-plugin.js` nie kopiuje się na stronę serwisu.

## Odpalenie

Na stronie serwisu, najpierw obiekt, potem skrypt z originu widgetu:

```html
<script>
  window.widgetPlugin = {
    showProduct: {
      productId: "audi-a4",
      cardUrl: "https://sklep.example/cards/audi-a4",
    },
  };
</script>
<script
  src="https://<origin-widgetu>/widget-plugin.js"
  data-eva-widget="eva-shop"
  async
></script>
```

`productId` to publiczne id produktu. `cardUrl` to adres `https` karty tego
serwisu. Pusty `window.widgetPlugin` zostawia sam czat. Złe `showProduct`
nie montuje ramki.

Produkcyjny origin widgetu: `https://widget-xi-eight.vercel.app`
(plik `widget-plugin.js` jest tam po wdrożeniu widgetu).

Kontrakt: `widget/public/widget-plugin.md`.
