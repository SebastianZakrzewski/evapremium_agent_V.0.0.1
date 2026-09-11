import { ContextTreeResolver } from '../context-tree/context-tree.resolver';
import type { ContextLeafLookupResult } from '../domain/context-tree';
import type { QuotePriceInput, QuotePriceResult } from '../domain/pricing';
import type {
  TemplateCascadeInput,
  TemplateCascadeResult,
} from '../domain/template-cascade';
import { PricingResolver } from '../pricing/pricing.resolver';
import { TemplateCascadeResolver } from '../templates/template-cascade.resolver';

export class ShopTools {
  constructor(
    private readonly templates: TemplateCascadeResolver,
    private readonly pricing: PricingResolver,
    private readonly contextTree: ContextTreeResolver,
  ) {}

  resolveTemplate(input: TemplateCascadeInput): TemplateCascadeResult {
    return this.templates.resolve(input);
  }

  quotePrice(input: QuotePriceInput): QuotePriceResult {
    return this.pricing.quote(input);
  }

  lookupLeaf(slug: string): ContextLeafLookupResult {
    return this.contextTree.lookupLeaf(slug);
  }
}
