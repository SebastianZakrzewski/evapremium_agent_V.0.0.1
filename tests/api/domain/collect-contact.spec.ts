import { InMemorySessionClients } from '@api/chat/session-clients';
import { ShopTools } from '@api/chat/shop-tools';
import { runWithTurnSession } from '@api/agent-events/turn-session-context';
import { ContextTreeResolver } from '@api/context-tree/context-tree.resolver';
import { InMemoryContextNodeCatalog } from '@api/context-tree/in-memory/in-memory-context-node-catalog';
import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import {
  advanceContactCollection,
  normalizeContactInput,
} from '@api/domain/collect-contact';
import { prepareIntentTurn } from '@api/mastra/intents/prepare-intent-turn';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import { PricingResolver } from '@api/pricing/pricing.resolver';
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
import { TemplateCascadeResolver } from '@api/templates/template-cascade.resolver';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from '@api/templates/in-memory/in-memory-catalogs';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';

describe('collect contact', () => {
  it('asks for a name, then a phone, and keeps an optional email', () => {
    const started = advanceContactCollection({ slots: {} });
    expect(started).toMatchObject({
      status: 'suspended',
      missing: 'given_name',
    });

    const named = advanceContactCollection({
      slots: started.status === 'suspended' ? started.snapshot.slots : {},
      message: 'Anna',
      asked: 'given_name',
    });
    expect(named).toMatchObject({ status: 'suspended', missing: 'phone' });

    const ready = advanceContactCollection({
      slots: named.status === 'suspended' ? named.snapshot.slots : {},
      message: 'anna@example.com 500 600 700',
      asked: 'phone',
    });
    expect(ready).toEqual({
      status: 'ready',
      tool: 'collect-contact',
      slots: {
        givenName: 'Anna',
        phone: '500600700',
        email: 'anna@example.com',
      },
    });
  });

  it('does not treat a vehicle reply as a name while fitment is open', async () => {
    const qualifier = new StubIntentQualifier();
    const first = await prepareIntentTurn(qualifier, 'Ile kosztują dywaniki?');
    expect(first.execution).toEqual({
      kind: 'workflow',
      workflow: 'fitment_cascade',
    });
    expect(first.contactWorkflow?.missing).toBe('given_name');
    expect(first.toolIds).toEqual([]);

    const second = await prepareIntentTurn(qualifier, 'Volkswagen', {
      fitment: first.fitment,
      contactWorkflow: first.contactWorkflow,
    });
    expect(second.fitment?.slots.car_brand).toBe('Volkswagen');
    expect(second.contactWorkflow?.missing).toBe('given_name');
    expect(second.contactWorkflow?.slots.givenName).toBeUndefined();
  });

  it('resumes contact collection after the vehicle slots are done', async () => {
    const qualifier = new StubIntentQualifier();
    const turn = await prepareIntentTurn(qualifier, 'Anna', {
      contactWorkflow: {
        workflow: 'collect_contact',
        step: 'waiting_for_contact',
        missing: 'given_name',
        slots: {},
      },
    });

    expect(turn.intent).toBe('pricing');
    expect(turn.toolIds).toEqual(['collect-contact']);
    expect(turn.contactWorkflow?.missing).toBe('phone');
    expect(turn.contactSlots).toEqual({ givenName: 'Anna' });
  });

  it('persists the name and phone through the shop tool', async () => {
    const clients = new InMemorySessionClients();
    const tools = new ShopTools(
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
      clients,
    );

    const waiting = await runWithTurnSession('session-1', () =>
      tools.collectContact(normalizeContactInput({ givenName: 'Anna' })),
    );
    expect(waiting).toMatchObject({ status: 'waiting', missing: 'phone', givenName: 'Anna' });

    const saved = await runWithTurnSession('session-1', () =>
      tools.collectContact({ phone: '500600700', email: 'anna@example.com' }),
    );
    expect(saved).toEqual({
      status: 'saved',
      givenName: 'Anna',
      phone: '500600700',
      email: 'anna@example.com',
    });

    const stored = await clients.get('session-1');
    expect(stored?.data).toMatchObject({
      givenName: 'Anna',
      phone: '500600700',
      email: 'anna@example.com',
    });
  });
});
