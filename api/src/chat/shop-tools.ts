import type { AgentEventSink } from '../agent-events/agent-event';
import { recordAgentEvent } from '../agent-events/record-agent-event';
import {
  agreementForLookup,
  logTreeLookup,
  logTreeSearch,
} from '../agent-events/tree-turn-log';
import { noteTurnLookup, noteTurnSearch } from '../agent-events/turn-trace';
import {
  currentRelatedBranches,
  currentTurnSessionId,
} from '../agent-events/turn-session-context';
import { ContextTreeResolver } from '../context-tree/context-tree.resolver';
import type { ContextLeafSearchHit } from '../domain/context-leaf-search';
import type { ContextLeafLookupResult } from '../domain/context-tree';
import type { QuotePriceInput, QuotePriceResult } from '../domain/pricing';
import type {
  TemplateCascadeInput,
  TemplateCascadeResult,
} from '../domain/template-cascade';
import {
  advanceContactCollection,
  contactSlotsFromClient,
  normalizeContactInput,
  type ContactSlots,
} from '../domain/collect-contact';
import { SessionClient } from '../domain/session-client';
import type { SessionClients } from './session-clients';
import { PricingResolver } from '../pricing/pricing.resolver';
import { TemplateCascadeResolver } from '../templates/template-cascade.resolver';

export class ShopTools {
  constructor(
    private readonly templates: TemplateCascadeResolver,
    private readonly pricing: PricingResolver,
    private readonly contextTree: ContextTreeResolver,
    private readonly events?: AgentEventSink,
    private readonly sessionClients?: SessionClients,
  ) {}

  async resolveTemplate(
    input: TemplateCascadeInput,
  ): Promise<TemplateCascadeResult> {
    const result = await this.templates.resolve(input);
    recordAgentEvent(this.events, 'cascade_resolved', { match: result.status });
    return result;
  }

  listVehicleAliases() {
    return this.templates.listAliases();
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

  async collectContact(input: ContactSlots): Promise<{
    status: 'waiting' | 'saved' | 'not_saved';
    missing?: 'given_name' | 'phone';
    givenName?: string;
    phone?: string;
    email?: string;
  }> {
    const sessionId = currentTurnSessionId();
    const stored =
      sessionId !== undefined && this.sessionClients !== undefined
        ? await this.sessionClients.get(sessionId)
        : undefined;
    const advanced = advanceContactCollection({
      slots: {
        ...contactSlotsFromClient(stored?.data ?? {}),
        ...normalizeContactInput(input),
      },
    });
    const slots =
      advanced.status === 'ready' ? advanced.slots : advanced.snapshot.slots;
    const persisted = await this.persistContact(sessionId, slots);
    if (advanced.status === 'suspended') {
      return { status: 'waiting', missing: advanced.missing, ...slots };
    }
    return { status: persisted ? 'saved' : 'not_saved', ...slots };
  }

  private async persistContact(
    sessionId: string | undefined,
    slots: ContactSlots,
  ): Promise<boolean> {
    if (
      sessionId === undefined ||
      this.sessionClients === undefined ||
      (!slots.givenName && !slots.phone && !slots.email)
    ) {
      return false;
    }
    const current =
      (await this.sessionClients.get(sessionId)) ??
      SessionClient.empty(sessionId);
    await this.sessionClients.save(current.rememberContact(slots));
    return true;
  }

  lookupLeaf(slug: string): ContextLeafLookupResult {
    const result = this.contextTree.lookupLeaf(slug);
    const resolved = result.status === 'hit' ? result.slug : slug;
    const outcome = result.status === 'hit' ? 'hit' : 'miss';
    if (result.status === 'hit') {
      recordAgentEvent(this.events, 'context_hit', { slug: result.slug });
    } else {
      recordAgentEvent(this.events, 'context_miss', { slug });
    }
    logTreeLookup(resolved, outcome);
    noteTurnLookup(currentTurnSessionId(), {
      slug: resolved,
      outcome,
      agreement: agreementForLookup(currentTurnSessionId(), resolved),
    });
    return result;
  }

  async searchLeaves(query: string): Promise<ContextLeafSearchHit[]> {
    const explained = await this.contextTree.explainSearch(
      query,
      currentRelatedBranches(),
    );
    const slugs = explained.hits.map((row) => row.slug);
    const confidence = explained.hits[0]?.confidence;
    recordAgentEvent(this.events, 'context_search', {
      slugs,
      matched: explained.hits.length > 0,
      confidence,
    });
    logTreeSearch(explained.trace);
    noteTurnSearch(currentTurnSessionId(), { slugs, confidence });
    return explained.hits;
  }
}
