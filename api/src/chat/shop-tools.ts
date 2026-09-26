import type { AgentEventSink } from '../agent-events/agent-event';
import { recordAgentEvent } from '../agent-events/record-agent-event';
import { logTreeLookup, logTreeSearch } from '../agent-events/tree-turn-log';
import { currentRelatedBranches } from '../agent-events/turn-session-context';
import { ContextTreeResolver } from '../context-tree/context-tree.resolver';
import type { ContextLeafSearchHit } from '../domain/context-leaf-search';
import type { ContextLeafLookupResult } from '../domain/context-tree';
import type { QuotePriceInput, QuotePriceResult } from '../domain/pricing';
import {
  composeQuoteVehicle,
  type QuoteVehiclePriceInput,
  type QuoteVehiclePriceResult,
} from '../domain/quote-vehicle-price';
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
    private readonly events?: AgentEventSink,
  ) {}

  resolveTemplate(input: TemplateCascadeInput): TemplateCascadeResult {
    const result = this.templates.resolve(input);
    recordAgentEvent(this.events, 'cascade_resolved', { match: result.status });
    return result;
  }

  quotePrice(input: QuotePriceInput): QuotePriceResult {
    const result = this.pricing.quote(input);
    if (result.status === 'quoted') {
      recordAgentEvent(this.events, 'quote_issued', {
        amount: result.amount,
        currency: result.currency,
      });
    }
    return result;
  }

  quoteVehicle(input: QuoteVehiclePriceInput): QuoteVehiclePriceResult {
    const result = composeQuoteVehicle(input, {
      resolveTemplate: (slots) => this.templates.resolve(slots),
      listCategoryVariants: (key) => this.pricing.listCategoryVariants(key),
      quotePrice: (quote) => this.pricing.quote(quote),
      matTypes: (category, variantKey) =>
        this.pricing.matTypes(category, variantKey),
    });
    if (result.status === 'quoted') {
      recordAgentEvent(this.events, 'quote_issued', {
        amount: result.amount,
        currency: result.currency,
      });
    }
    return result;
  }

  lookupLeaf(slug: string): ContextLeafLookupResult {
    const result = this.contextTree.lookupLeaf(slug);
    if (result.status === 'hit') {
      recordAgentEvent(this.events, 'context_hit', { slug: result.slug });
      logTreeLookup(result.slug, 'hit');
    } else {
      recordAgentEvent(this.events, 'context_miss', { slug });
      logTreeLookup(slug, 'miss');
    }
    return result;
  }

  async searchLeaves(query: string): Promise<ContextLeafSearchHit[]> {
    const explained = await this.contextTree.explainSearch(
      query,
      currentRelatedBranches(),
    );
    recordAgentEvent(this.events, 'context_search', {
      slugs: explained.hits.map((row) => row.slug),
      matched: explained.hits.length > 0,
      confidence: explained.hits[0]?.confidence,
    });
    logTreeSearch(explained.trace);
    return explained.hits;
  }
}
