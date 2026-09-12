import { ShopTools } from '../chat/shop-tools';
import { ContextTreeResolver } from '../context-tree/context-tree.resolver';
import { CONTEXT_TREE_NODES } from '../context-tree/in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from '../context-tree/in-memory/in-memory-context-node-catalog';
import { PricingResolver } from '../pricing/pricing.resolver';
import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from '../pricing/in-memory/pricing-fixture';
import {
  InMemoryPricingCategoryVariantCatalog,
  InMemoryPricingMatrixCatalog,
  InMemoryPricingVariantCatalog,
} from '../pricing/in-memory/in-memory-pricing-catalogs';
import { TemplateCascadeResolver } from '../templates/template-cascade.resolver';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '../templates/in-memory/cascade-fixture';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from '../templates/in-memory/in-memory-catalogs';
import { createEvaMastra } from './create-eva-mastra';

function studioShopTools(): ShopTools {
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

export const mastra = createEvaMastra(studioShopTools());
