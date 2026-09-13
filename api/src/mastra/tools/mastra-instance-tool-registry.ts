import type { ShopToolCatalog } from './types';

export function mastraInstanceToolRegistry(
  catalog: ShopToolCatalog,
): { tools: ShopToolCatalog } {
  return { tools: catalog };
}
