import type { AgentEventSink } from '../agent-events/agent-event';
import { recordAgentEvent } from '../agent-events/record-agent-event';
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

  lookupLeaf(slug: string): ContextLeafLookupResult {
    const result = this.contextTree.lookupLeaf(slug);
    if (result.status === 'hit') {
      recordAgentEvent(this.events, 'context_hit', { slug: result.slug });
    } else {
      recordAgentEvent(this.events, 'context_miss', { slug });
    }
    return result;
  }
}
