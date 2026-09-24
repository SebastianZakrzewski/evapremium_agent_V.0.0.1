import type { ContextNode } from '../../domain/context-tree';

/** Disjoint retrieval_text for calibration collision pairs (verify fixture). */
export const HYBRID_RETRIEVAL_TEXT_BY_SLUG: Record<string, string> = {
  dostawa:
    'kiedy wyślecie zamówienie wysyłka kurier paczka nadanie przesyłki tracking dostawa do klienta magazyn wyjazd',
  'czas-produkcji':
    'ile trwa szycie dni szycia ile czeka na uszycie dni robocze produkcja realizacja na zamówienie termin wykonania',
  gwarancja:
    'jak długo jest gwarancja okres gwarancji ile lat rękojmia wady fabryczne warunki gwarancji producenta',
  'niedopasowanie-wymiana':
    'nie pasują co robić zły rozmiar niedopasowanie po dostawie wymiana za duże za małe nie leżą',
  'dopasowanie-model':
    'jak dobrać pomóżcie dobrać model marka rok generacja szablon pojazdu wybór samochodu konfigurator czy pasują do każdego auta',
  'material-eva':
    'z czego wykonane materiał pianka EVA skład chemiczny tworzywo piankowe czy gumowe czy piankowe mata podłogowa',
  czyszczenie: 'czyścić prać myć pielęgnacja odkurzanie myjka detergent pralka jak dbać',
  '3d-bez-rantow':
    'wariant 3D bez rantów płaski brzeg bez obwódki bez wysokiego brzegu niski profil krawędzi',
  '3d-z-rantami':
    'wariant 3D z rantami rant boczny obwódka wysoki brzeg model z rantami rant dookoła krawędź',
  kolory:
    'paleta kolorów odcienie barwy czarny szary beż czerwony niebieski brąz kość słoniowa wybór koloru obwódki lista barw warianty kolorystyczne',
  montaz:
    'montaż instalacja jak zamontować jak założyć w aucie instrukcja pierwszego zakładania',
  wlasciwosci:
    'właściwości parametry odporność na wodę brud sztywność antypoślizgowe cechy pianki',
  'trwalosc-dywanikow':
    'trwałość żywotność ile lat wytrzymują szybko się niszczą zużycie przy codziennym użytkowaniu wytrzymałe na lata',
  'uzytkowanie-zima-lato':
    'użytkowanie zima lato mróz upał temperatura sezon całoroczne',
  reklamacja:
    'jak zgłosić reklamację procedura formularz wada uszkodzenie w transporcie co podać w zgłoszeniu',
  kontakt: 'kontakt telefon mail infolinia godziny otwarcia adres sklepu konsultant',
  podpietki:
    'podpiętki mocowanie klipsy haczyki trzymanie pod piętą dokupić do zestawu',
};

export function withHybridRetrievalText(nodes: ContextNode[]): ContextNode[] {
  return nodes.map((node) => {
    const text = HYBRID_RETRIEVAL_TEXT_BY_SLUG[node.slug];
    if (text === undefined) {
      return node;
    }
    return { ...node, retrievalText: text };
  });
}

export function calibrationLeafNode(slug: string, index: number): ContextNode {
  const custom = HYBRID_RETRIEVAL_TEXT_BY_SLUG[slug];
  return {
    id: `cal-${slug}-${index}`,
    parentId: null,
    slug,
    title: slug,
    body: `Treść polityki dla ${slug}.`,
    retrievalText: custom ?? `informacja ${slug}`,
    sortOrder: index,
    isActive: true,
  };
}

export function nodesForCalibrationSlugs(slugs: string[]): ContextNode[] {
  const unique = [...new Set(slugs)];
  return unique.map((slug, index) => calibrationLeafNode(slug, index));
}
