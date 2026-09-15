import type { ContextNode } from './context-tree';

export function eligibleLeavesForEmbedding(nodes: ContextNode[]): ContextNode[] {
  return nodes.filter((node) => {
    const isLeaf = !nodes.some((candidate) => candidate.parentId === node.id);
    return node.isActive && isLeaf && node.body.trim() !== '';
  });
}

export function retrievalTextForSearch(node: ContextNode): string {
  const custom = node.retrievalText?.trim();
  if (custom) {
    return custom;
  }
  return `${node.title}\n${node.body}`;
}

export function embeddingChunk(node: ContextNode): string {
  return retrievalTextForSearch(node);
}
