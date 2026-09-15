export type ContextNode = {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  body: string;
  /** Search-only copy; lookup still uses body. */
  retrievalText?: string;
  sortOrder: number;
  isActive: boolean;
};

export type ContextLeafLookupResult =
  | { status: 'hit'; slug: string; title: string; body: string }
  | { status: 'miss' };

function isLeaf(node: ContextNode, nodes: ContextNode[]): boolean {
  return !nodes.some((candidate) => candidate.parentId === node.id);
}

export function lookupContextLeaf(
  slug: string,
  nodes: ContextNode[],
): ContextLeafLookupResult {
  const node = nodes.find((row) => row.slug === slug);
  if (node === undefined || !node.isActive || !isLeaf(node, nodes)) {
    return { status: 'miss' };
  }

  return {
    status: 'hit',
    slug: node.slug,
    title: node.title,
    body: node.body,
  };
}
