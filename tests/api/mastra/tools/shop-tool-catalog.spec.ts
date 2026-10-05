import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from '@api/context-tree/in-memory/in-memory-context-node-catalog';
import { ContextTreeResolver } from '@api/context-tree/context-tree.resolver';
import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from '@api/pricing/in-memory/pricing-fixture';
import {
  InMemoryPricingCategoryVariantCatalog,
  InMemoryPricingMatrixCatalog,
  InMemoryPricingVariantCatalog,
} from '@api/pricing/in-memory/in-memory-pricing-catalogs';
import { PricingResolver } from '@api/pricing/pricing.resolver';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from '@api/templates/in-memory/in-memory-catalogs';
import { TemplateCascadeResolver } from '@api/templates/template-cascade.resolver';
import { ShopTools } from '@api/chat/shop-tools';
import { SHOP_TOOL_IDS } from '@api/mastra/intents/schema';
import { createShopToolCatalog } from '@api/mastra/tools/create-shop-tool-catalog';
import { mastraInstanceToolRegistry } from '@api/mastra/tools/mastra-instance-tool-registry';

function fixtureShopTools(): ShopTools {
  return new ShopTools(
    new TemplateCascadeResolver(
      new InMemoryTemplateCatalog(CASCADE_TEMPLATES),
      new InMemoryAliasCatalog(CASCADE_ALIASES),
    ),
    new PricingResolver(
      new InMemoryPricingVariantCatalog(PRICING_VARIANTS),
      new InMemoryPricingCategoryVariantCatalog(PRICING_CATEGORY_VARIANTS),
      new InMemoryPricingMatrixCatalog(PRICING_MATRIX),
    ),
    new ContextTreeResolver(new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES)),
  );
}

describe('shop tool catalog', () => {
  it('builds one Mastra tool per ShopToolId with matching id', () => {
    const catalog = createShopToolCatalog(fixtureShopTools());

    for (const id of SHOP_TOOL_IDS) {
      expect(catalog[id].id).toBe(id);
    }
  });

  it('registers the full catalog on the Mastra instance for Studio', () => {
    const catalog = createShopToolCatalog(fixtureShopTools());
    const registry = mastraInstanceToolRegistry(catalog);

    expect(Object.keys(registry.tools).sort()).toEqual(
      [...SHOP_TOOL_IDS].sort(),
    );
    expect(registry.tools).toBe(catalog);
  });
});
