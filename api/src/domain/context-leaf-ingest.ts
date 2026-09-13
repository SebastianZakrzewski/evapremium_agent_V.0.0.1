import type { ContextNode } from './context-tree';

export function eligibleLeavesForEmbedding(nodes: ContextNode[]): ContextNode[] {
  return nodes.filter((node) => {
    const isLeaf = !nodes.some((candidate) => candidate.parentId === node.id);
    return node.isActive && isLeaf && node.body.trim() !== '';
  });
}

export function embeddingChunk(node: ContextNode): string {
  return `${node.title}\n${node.body}`;
}
