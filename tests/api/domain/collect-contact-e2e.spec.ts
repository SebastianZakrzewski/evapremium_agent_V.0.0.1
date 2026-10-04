import { runWithTurnSession } from '@api/agent-events/turn-session-context';
import { InMemorySessionClients } from '@api/chat/session-clients';
import { ShopTools } from '@api/chat/shop-tools';
import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from '@api/context-tree/in-memory/in-memory-context-node-catalog';
import { ContextTreeResolver } from '@api/context-tree/context-tree.resolver';
import { contactSlotsFromClient } from '@api/domain/collect-contact';
import {
  SessionClient,
  shouldRememberQualifierEntities,
} from '@api/domain/session-client';
import {
  InMemoryIntentSessionState,
  type IntentSessionState,
} from '@api/mastra/intents/intent-session-state';
import { prepareIntentTurn } from '@api/mastra/intents/prepare-intent-turn';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import {
  InMemoryPricingCategoryVariantCatalog,
  InMemoryPricingMatrixCatalog,
  InMemoryPricingVariantCatalog,
} from '@api/pricing/in-memory/in-memory-pricing-catalogs';
import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from '@api/pricing/in-memory/pricing-fixture';
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

type ToolResult = {
  status: 'waiting' | 'saved' | 'not_saved';
  missing?: 'given_name' | 'phone';
  givenName?: string;
  phone?: string;
  email?: string;
};

class QuoteContactSimulation {
  readonly calls: string[] = [];
  private readonly state: IntentSessionState = new InMemoryIntentSessionState();
  private readonly clients = new InMemorySessionClients();
  private readonly qualifier = new StubIntentQualifier();
  private readonly tools: ShopTools;

  constructor() {
    this.tools = new ShopTools(
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
      undefined,
      this.clients,
    );
  }

  async say(sessionId: string, message: string): Promise<{
    intent: string;
    toolIds: string[];
    tool?: ToolResult;
    stored?: { givenName?: string; phone?: string; email?: string };
  }> {
    await this.state.load(sessionId);
    const stored = await this.clients.get(sessionId);
    const prepared = await prepareIntentTurn(this.qualifier, message, {
      currentIntent: this.state.get(sessionId),
      quoteWorkflow: this.state.getQuoteWorkflow(sessionId),
      fitment: this.state.getFitment(sessionId),
      contactWorkflow: this.state.getContactWorkflow(sessionId),
      knownContact: stored ? contactSlotsFromClient(stored.data) : undefined,
      knownVehicle: stored?.hasFacts() ? stored.data : undefined,
      sessionId,
    });
    await this.remember(sessionId, message, prepared);
    this.state.set(sessionId, prepared.intent);
    this.state.setQuoteWorkflow(sessionId, prepared.quoteWorkflow);
    this.state.setContactWorkflow(sessionId, prepared.contactWorkflow);
    if (prepared.fitment) {
      this.state.setFitment(sessionId, prepared.fitment);
    } else if (prepared.clearFitment) {
      this.state.setFitment(sessionId, undefined);
    }
    await this.state.flush(sessionId);

    let tool: ToolResult | undefined;
    if (prepared.toolIds.includes('collect-contact')) {
      this.calls.push(sessionId);
      tool = await runWithTurnSession(sessionId, () =>
        this.tools.collectContact(prepared.contactSlots ?? {}),
      );
    }
    const row = await this.clients.get(sessionId);
    return {
      intent: prepared.intent,
      toolIds: [...prepared.toolIds],
      tool,
      stored: row && {
        givenName: row.data.givenName,
        phone: row.data.phone,
        email: row.data.email,
      },
    };
  }

  private async remember(
    sessionId: string,
    message: string,
    prepared: Awaited<ReturnType<typeof prepareIntentTurn>>,
  ): Promise<void> {
    const current =
      (await this.clients.get(sessionId)) ?? SessionClient.empty(sessionId);
    const remembered = current
      .rememberUtterance(message, '2026-10-04T20:00:00.000Z')
      .rememberVehicle({
        entities: shouldRememberQualifierEntities(prepared)
          ? prepared.entities
          : {},
        collectedSlots: prepared.collectedSlots,
        fitment: prepared.fitment,
        quoteEntities: prepared.quoteWorkflow?.entities,
        cascadeMatch: prepared.fitment ? undefined : prepared.cascadeMatch,
        verifiedProduct: prepared.verifiedProduct,
      });
    const next = prepared.contactSlots
      ? remembered.rememberContact(prepared.contactSlots)
      : remembered;
    if (next.hasFacts() && !next.equals(current)) {
      await this.clients.save(next);
    }
  }
}

describe('collect-contact conversation simulation', () => {
  it('collects a name and phone across a quote, then keeps an optional email', async () => {
    const sim = new QuoteContactSimulation();
    const session = 'quote-then-contact';

    const ask = await sim.say(session, 'Ile kosztują dywaniki?');
    const brand = await sim.say(session, 'Volkswagen');
    const model = await sim.say(session, 'Golf 8');
    const year = await sim.say(session, '2019');
    const body = await sim.say(session, 'kombi');
    const name = await sim.say(session, 'Anna');
    const phone = await sim.say(session, '500 600 700');
    const email = await sim.say(session, 'anna@example.com');

    expect(ask.tool).toBeUndefined();
    expect(brand.tool).toBeUndefined();
    expect(model.tool).toBeUndefined();
    expect(year.tool).toBeUndefined();
    expect(body.tool).toMatchObject({ status: 'waiting', missing: 'given_name' });
    expect(name.tool).toMatchObject({
      status: 'waiting',
      missing: 'phone',
      givenName: 'Anna',
    });
    expect(phone.tool).toEqual({
      status: 'saved',
      givenName: 'Anna',
      phone: '500600700',
    });
    expect(email.tool).toEqual({
      status: 'saved',
      givenName: 'Anna',
      phone: '500600700',
      email: 'anna@example.com',
    });
    expect(email.stored).toEqual({
      givenName: 'Anna',
      phone: '500600700',
      email: 'anna@example.com',
    });
    expect(sim.calls).toEqual([session, session, session, session]);
  });

  it('saves name, phone and email from one priced sentence', async () => {
    const sim = new QuoteContactSimulation();
    const turn = await sim.say(
      'one-sentence',
      'Ile kosztują dywaniki Volkswagen Golf 8 kombi 2019, nazywam się Anna, tel. 500600700, anna@example.com',
    );

    expect(turn.intent).toBe('pricing');
    expect(turn.toolIds).toEqual(['quote-vehicle', 'collect-contact']);
    expect(turn.tool).toEqual({
      status: 'saved',
      givenName: 'Anna',
      phone: '500600700',
      email: 'anna@example.com',
    });
    expect(turn.stored).toEqual(turn.tool && {
      givenName: 'Anna',
      phone: '500600700',
      email: 'anna@example.com',
    });
  });

  it('does not run collect-contact for a price explanation or a delivery question', async () => {
    const sim = new QuoteContactSimulation();

    const knowledge = await sim.say('faq', 'Jak liczona jest cena?');
    const delivery = await sim.say('faq', 'Jaki jest termin dostawy?');

    expect(knowledge.intent).toBe('pricing');
    expect(knowledge.toolIds).not.toContain('collect-contact');
    expect(knowledge.tool).toBeUndefined();
    expect(delivery.intent).toBe('delivery');
    expect(delivery.tool).toBeUndefined();
    expect(delivery.stored).toBeUndefined();
    expect(sim.calls).toEqual([]);
  });

  it('keeps a stored contact when the client asks for another quote', async () => {
    const sim = new QuoteContactSimulation();
    const session = 'again';
    await sim.say(
      session,
      'Ile kosztują dywaniki Volkswagen Golf 8 kombi 2019, nazywam się Anna, tel. 500600700',
    );

    const again = await sim.say(
      session,
      'Ile kosztują dywaniki Volkswagen Golf 8 kombi 2020?',
    );

    expect(again.tool).toEqual({
      status: 'saved',
      givenName: 'Anna',
      phone: '500600700',
    });
    expect(again.stored).toEqual({
      givenName: 'Anna',
      phone: '500600700',
    });
  });
});
