import type { ContextNode } from '../../domain/context-tree';

/** Disjoint retrieval_text for calibration collision pairs (verify fixture). */
export const HYBRID_RETRIEVAL_TEXT_BY_SLUG: Record<string, string> = {
  dostawa:
    'wysyłka kurier paczka zamówienie kiedy wyślecie dostawa do klienta',
  'czas-produkcji':
    'dni szycia produkcja realizacja ile trwa wykonanie dywaników',
  gwarancja: 'gwarancja okres lat miesięcy na dywaniki EVA',
  'niedopasowanie-wymiana':
    'nie pasują wymiana reklamacja niedopasowanie po zakupie',
  'dopasowanie-model': 'dobór model auta marka dopasowanie szablonu',
  'material-eva': 'materiał pianka EVA z czego wykonane',
  czyszczenie: 'czyścić prać myć dywaniki pielęgnacja',
  '3d-bez-rantow': 'ranty bez rantów wariant 3D',
  '3d-z-rantami': 'ranty z rantami wariant 3D',
  kolory: 'kolory odcienie paleta',
  montaz: 'montaż instalacja dywaników',
  wlasciwosci: 'właściwości parametry materiału',
  'trwalosc-dywanikow':
    'trwałość dywaników jak długo wytrzymują ile lat służą żywotność czy szybko się niszczą wytrzymałość',
  'uzytkowanie-zima-lato': 'użytkowanie zima lato temperatura',
  reklamacja: 'reklamacja zwrot procedura',
  kontakt: 'kontakt telefon mail sklep',
  podpietki: 'podpietki mocowanie dywaników',
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
