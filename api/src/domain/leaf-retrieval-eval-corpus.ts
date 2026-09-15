import type { ContextNode } from './context-tree';

/** Polish FAQ leaves aligned with PROD RAG index (~17 searchable FAQ slugs). */
export type LeafRetrievalBusinessArea =
  | 'product'
  | 'delivery'
  | 'after_sales'
  | 'contact';

export type LeafRetrievalEvalCorpusEntry = {
  slug: string;
  title: string;
  retrievalText: string;
  businessArea: LeafRetrievalBusinessArea;
};

export const LEAF_RETRIEVAL_EVAL_CORPUS: LeafRetrievalEvalCorpusEntry[] = [
  {
    slug: 'material-eva',
    title: 'Materiał EVA',
    businessArea: 'product',
    retrievalText:
      'z czego wykonane dywaniki materiał pianka EVA skład chemiczny tworzywo piankowe guma piankowa mata podłogowa nie gumowa',
  },
  {
    slug: 'kolory',
    title: 'Kolory',
    businessArea: 'product',
    retrievalText:
      'jakie kolory dywaników paleta odcieni barwy czarny szary beż czerwony niebieski wybór koloru obwódki lista kolorów',
  },
  {
    slug: '3d-z-rantami',
    title: '3D z rantami',
    businessArea: 'product',
    retrievalText:
      'dywaniki 3D z rantami wariant z rantem bocznym obwódka krawędź wysoki brzeg model z rantami',
  },
  {
    slug: '3d-bez-rantow',
    title: '3D bez rantów',
    businessArea: 'product',
    retrievalText:
      'dywaniki 3D bez rantów wariant płaski brzeg bez obwódki bez rantów przy krawędzi niski brzeg',
  },
  {
    slug: 'montaz',
    title: 'Montaż',
    businessArea: 'product',
    retrievalText:
      'montaż instalacja zakładanie dywaników w aucie jak zamocować',
  },
  {
    slug: 'wlasciwosci',
    title: 'Właściwości',
    businessArea: 'product',
    retrievalText:
      'właściwości parametry odporność woda brud sztywność antypoślizgowe',
  },
  {
    slug: 'trwalosc-dywanikow',
    title: 'Trwałość dywaników',
    businessArea: 'product',
    retrievalText:
      'trwałość dywaników jak długo wytrzymują dywaniki ile lat służą dywaniki żywotność dywaników czy dywaniki są trwałe czy szybko się niszczą odporność materiału wytrzymałość dywaników',
  },
  {
    slug: 'uzytkowanie-zima-lato',
    title: 'Użytkowanie zima lato',
    businessArea: 'product',
    retrievalText:
      'użytkowanie zima lato mróz upał temperatura sezon całoroczne',
  },
  {
    slug: 'dopasowanie-model',
    title: 'Dopasowanie modelu',
    businessArea: 'product',
    retrievalText:
      'dopasowanie model auta marka rok generacja szablon wybór pojazdu',
  },
  {
    slug: 'podpietki',
    title: 'Podpietki',
    businessArea: 'product',
    retrievalText:
      'podpietki mocowanie klipsy haczyki trzymanie dywanika pod stopą',
  },
  {
    slug: 'dostawa',
    title: 'Dostawa',
    businessArea: 'delivery',
    retrievalText:
      'kiedy wyślecie zamówienie wysyłka kurier paczka nadanie przesyłki tracking dostawa do klienta magazyn wyjazd',
  },
  {
    slug: 'czas-produkcji',
    title: 'Czas produkcji',
    businessArea: 'delivery',
    retrievalText:
      'ile trwa realizacja produkcja dni szycia wykonanie dywaników na zamówienie termin uszycia robocze dni produkcyjne',
  },
  {
    slug: 'gwarancja',
    title: 'Gwarancja',
    businessArea: 'after_sales',
    retrievalText:
      'gwarancja okres lat miesięcy na dywaniki EVA rękojmia ustawowa',
  },
  {
    slug: 'czyszczenie',
    title: 'Czyszczenie',
    businessArea: 'after_sales',
    retrievalText:
      'czyścić prać myć dywaniki pielęgnacja odkurzanie woda myjka',
  },
  {
    slug: 'reklamacja',
    title: 'Reklamacja',
    businessArea: 'after_sales',
    retrievalText:
      'reklamacja procedura zgłoszenie wada uszkodzenie formularz kontakt',
  },
  {
    slug: 'niedopasowanie-wymiana',
    title: 'Niedopasowanie i wymiana',
    businessArea: 'after_sales',
    retrievalText:
      'nie pasują wymiana reklamacja niedopasowanie po zakupie zły rozmiar',
  },
  {
    slug: 'kontakt',
    title: 'Kontakt',
    businessArea: 'contact',
    retrievalText:
      'kontakt telefon mail sklep infolinia godziny otwarcia adres',
  },
];

export function evalCorpusNodes(): ContextNode[] {
  return LEAF_RETRIEVAL_EVAL_CORPUS.map((row, index) => ({
    id: `eval-${row.slug}`,
    parentId: null,
    slug: row.slug,
    title: row.title,
    body: `Polityka sklepu: ${row.title}.`,
    retrievalText: row.retrievalText,
    sortOrder: index,
    isActive: true,
  }));
}

export function evalCorpusSlugSet(): Set<string> {
  return new Set(LEAF_RETRIEVAL_EVAL_CORPUS.map((row) => row.slug));
}
