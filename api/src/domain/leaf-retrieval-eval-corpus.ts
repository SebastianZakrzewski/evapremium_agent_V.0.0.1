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
      'z czego wykonane materiał pianka EVA skład chemiczny tworzywo piankowe czy gumowe czy piankowe mata podłogowa',
  },
  {
    slug: 'kolory',
    title: 'Kolory',
    businessArea: 'product',
    retrievalText:
      'paleta kolorów odcienie barwy czarny szary beż czerwony niebieski brąz kość słoniowa wybór koloru obwódki lista barw warianty kolorystyczne',
  },
  {
    slug: '3d-z-rantami',
    title: '3D z rantami',
    businessArea: 'product',
    retrievalText:
      'wariant 3D z rantami rant boczny obwódka wysoki brzeg model z rantami rant dookoła krawędź',
  },
  {
    slug: '3d-bez-rantow',
    title: '3D bez rantów',
    businessArea: 'product',
    retrievalText:
      'wariant 3D bez rantów płaski brzeg bez obwódki bez wysokiego brzegu niski profil krawędzi',
  },
  {
    slug: 'montaz',
    title: 'Montaż',
    businessArea: 'product',
    retrievalText:
      'montaż instalacja jak zamontować jak założyć w aucie instrukcja pierwszego zakładania',
  },
  {
    slug: 'wlasciwosci',
    title: 'Właściwości',
    businessArea: 'product',
    retrievalText:
      'właściwości parametry odporność na wodę brud sztywność antypoślizgowe cechy pianki',
  },
  {
    slug: 'trwalosc-dywanikow',
    title: 'Trwałość dywaników',
    businessArea: 'product',
    retrievalText:
      'trwałość żywotność ile lat wytrzymują szybko się niszczą zużycie przy codziennym użytkowaniu wytrzymałe na lata',
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
      'jak dobrać pomóżcie dobrać model marka rok generacja szablon pojazdu wybór samochodu konfigurator czy pasują do każdego auta',
  },
  {
    slug: 'podpietki',
    title: 'Podpietki',
    businessArea: 'product',
    retrievalText:
      'podpiętki mocowanie klipsy haczyki trzymanie pod piętą dokupić do zestawu',
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
      'ile trwa szycie dni szycia ile czeka na uszycie dni robocze produkcja realizacja na zamówienie termin wykonania',
  },
  {
    slug: 'gwarancja',
    title: 'Gwarancja',
    businessArea: 'after_sales',
    retrievalText:
      'jak długo jest gwarancja okres gwarancji ile lat rękojmia wady fabryczne warunki gwarancji producenta',
  },
  {
    slug: 'czyszczenie',
    title: 'Czyszczenie',
    businessArea: 'after_sales',
    retrievalText:
      'czyścić prać myć pielęgnacja odkurzanie myjka detergent pralka jak dbać',
  },
  {
    slug: 'reklamacja',
    title: 'Reklamacja',
    businessArea: 'after_sales',
    retrievalText:
      'jak zgłosić reklamację procedura formularz wada uszkodzenie w transporcie co podać w zgłoszeniu',
  },
  {
    slug: 'niedopasowanie-wymiana',
    title: 'Niedopasowanie i wymiana',
    businessArea: 'after_sales',
    retrievalText:
      'nie pasują co robić zły rozmiar niedopasowanie po dostawie wymiana za duże za małe nie leżą',
  },
  {
    slug: 'kontakt',
    title: 'Kontakt',
    businessArea: 'contact',
    retrievalText:
      'kontakt telefon mail infolinia godziny otwarcia adres sklepu konsultant',
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
