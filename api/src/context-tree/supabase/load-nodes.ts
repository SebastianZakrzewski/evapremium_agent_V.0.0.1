import type { ContextNode } from '../../domain/context-tree';
import type { DataStore } from '../../supabase/data-store';

type NodeRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
};

export async function loadContextNodes(store: DataStore): Promise<ContextNode[]> {
  const rows = await store.selectAll<NodeRow>('eva_bot', 'context_nodes');
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}
