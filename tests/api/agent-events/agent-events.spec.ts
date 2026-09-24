import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import {
  CONTEXT_LEAF_SEARCH_FIXTURE,
  CONTEXT_LEAF_SEARCH_QUERIES,
} from '@api/context-tree/in-memory/context-leaf-search-fixture';
import { InMemoryContextLeafVectors } from '@api/context-tree/in-memory/in-memory-context-leaf-vectors';
import { MapTextEmbedder } from '@api/context-tree/in-memory/map-text-embedder';
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
import { StubChatAgent } from '@api/chat/stub-chat.agent';
import { postChatMessage } from '@api/chat/post-chat-message';
import { InMemoryChatSessions } from '@api/chat/chat-session';
import { BitrixLeadClient, FakeBitrixHttp } from '@api/lead/fake-bitrix-http';
import { LeadAttemptService } from '@api/lead/lead-attempt.service';
import { MastraChatAgent } from '@api/chat/mastra-chat.agent';
import { InMemoryIntentSessionState } from '@api/mastra/intents/intent-session-state';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import {
  executeShopTool,
  formatUsedToolLog,
} from '@api/agent-events/execute-shop-tool';
import { InMemoryAgentEvents } from '@api/agent-events/in-memory-agent-events';
import { runWithTurnSession } from '@api/agent-events/turn-session-context';

const USER_MESSAGE = 'quote passenger_car komplet-5szt please call me at +48';

function shopTools(events: InMemoryAgentEvents): ShopTools {
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
    new ContextTreeResolver(
      new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
      new MapTextEmbedder(CONTEXT_LEAF_SEARCH_QUERIES),
      new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE),
    ),
    events,
  );
}

describe('agent domain events', () => {
  it('records cascade none/one/many without message text', async () => {
    const events = new InMemoryAgentEvents();
    const tools = shopTools(events);

    await runWithTurnSession('session-cascade', async () => {
      tools.resolveTemplate({ brand: 'brak' });
      tools.resolveTemplate({
        brand: 'vw',
        model: 'golf 8',
        bodyType: 'kombi',
        year: 2021,
      });
      tools.resolveTemplate({ brand: 'vw' });
    });

    expect(events.list().map((row) => row.type)).toEqual([
      'cascade_resolved',
      'cascade_resolved',
      'cascade_resolved',
    ]);
    expect(events.list().map((row) => row.payload)).toEqual([
      { match: 'none' },
      { match: 'one' },
      { match: 'many' },
    ]);
    expect(JSON.stringify(events.list())).not.toContain(USER_MESSAGE);
  });

  it('records quote_issued only when the matrix returns an amount', async () => {
    const events = new InMemoryAgentEvents();
    const tools = shopTools(events);

    await runWithTurnSession('session-quote', async () => {
      tools.quotePrice({
        dealerPricingCategoryKey: 'passenger_car',
        variantKey: 'komplet-5szt',
      });
      tools.quotePrice({
        dealerPricingCategoryKey: 'passenger_car',
        variantKey: 'not-a-variant',
      });
    });

    expect(events.list()).toEqual([
      expect.objectContaining({
        sessionId: 'session-quote',
        type: 'quote_issued',
        payload: { amount: 599, currency: 'PLN' },
      }),
    ]);
  });

  it('records context_hit and context_miss without leaf body', async () => {
    const events = new InMemoryAgentEvents();
    const tools = shopTools(events);

    await runWithTurnSession('session-leaf', async () => {
      tools.lookupLeaf('dostawa');
      tools.lookupLeaf('pielegnacja');
    });

    expect(events.list()).toEqual([
      expect.objectContaining({
        type: 'context_hit',
        payload: { slug: 'dostawa' },
      }),
      expect.objectContaining({
        type: 'context_miss',
        payload: { slug: 'pielegnacja' },
      }),
    ]);
    expect(JSON.stringify(events.list())).not.toContain(
      'Wysyłka w 5–7 dni roboczych.',
    );
  });

  it('records context_search slugs without leaf body', async () => {
    const events = new InMemoryAgentEvents();
    const tools = shopTools(events);

    await runWithTurnSession('session-search', async () => {
      await tools.searchLeaves('kiedy wyślecie dywaniki');
      await tools.searchLeaves('jaki mam VIN');
    });

    expect(events.list()).toEqual([
      expect.objectContaining({
        type: 'context_search',
        payload: expect.objectContaining({
          slugs: ['dostawa'],
          matched: true,
          confidence: 'high',
        }),
      }),
      expect.objectContaining({
        type: 'context_search',
        payload: { slugs: [], matched: false },
      }),
    ]);
    expect(JSON.stringify(events.list())).not.toContain(
      'Wysyłka w 5–7 dni roboczych.',
    );
  });

  it('records lead_attempted for consent and skip outcomes', async () => {
    const events = new InMemoryAgentEvents();
    const leads = new LeadAttemptService(
      new BitrixLeadClient(
        new FakeBitrixHttp(),
        'https://example.bitrix24.pl/rest/1/fake',
      ),
      events,
    );

    await leads.create({
      sessionId: 'session-lead',
      consent: true,
      contact: { email: 'klient@example.com' },
      vehicleDescription: 'Golf 8',
    });
    await leads.create({
      sessionId: 'session-lead',
      consent: false,
      contact: { email: 'klient@example.com' },
      vehicleDescription: 'Golf 8',
    });

    expect(
      events.list().filter((row) => row.type === 'lead_attempted'),
    ).toEqual([
      expect.objectContaining({
        payload: { outcome: 'created' },
      }),
      expect.objectContaining({
        payload: { outcome: 'skipped_no_consent' },
      }),
    ]);
  });

  it('records intent_accepted from the Mastra chat turn without the user text', async () => {
    const events = new InMemoryAgentEvents();
    const stream = jest.fn(async () => ({
      textStream: (async function* () {
        yield 'ok';
      })(),
    }));
    const agent = new MastraChatAgent(
      { stream } as never,
      new StubIntentQualifier(),
      new InMemoryIntentSessionState(),
      events,
    );

    const chunks: string[] = [];
    for await (const chunk of agent.stream(
      'Ile kosztują dywaniki do Golfa 8?',
      'session-intent',
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['ok']);
    expect(events.list()).toEqual([
      expect.objectContaining({
        sessionId: 'session-intent',
        type: 'intent_accepted',
        payload: { intent: 'pricing' },
      }),
      expect.objectContaining({
        sessionId: 'session-intent',
        type: 'decision_trace',
        payload: {
          intent: 'pricing',
          sub_intent: 'indicative_quote',
          mode: 'action',
          execution: 'workflow',
          workflow: 'quote_vehicle',
        },
      }),
    ]);
    expect(JSON.stringify(events.list())).not.toContain('Ile kosztują');
  });

  it('logs the shop tool id when a tool runs', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      await executeShopTool(undefined, 'search-leaves', () => 'ok');
      expect(info).toHaveBeenCalledWith(formatUsedToolLog('search-leaves'));
      expect(formatUsedToolLog('search-leaves')).toBe(
        'użyte narzędzie: "search-leaves"',
      );
    } finally {
      info.mockRestore();
    }
  });

  it('records tool_failed without chat copy when a shop tool throws', async () => {
    const events = new InMemoryAgentEvents();

    await expect(
      runWithTurnSession('session-fail', () =>
        executeShopTool(events, 'quote-price', () => {
          throw new Error(USER_MESSAGE);
        }),
      ),
    ).rejects.toThrow(USER_MESSAGE);

    expect(events.list()).toEqual([
      expect.objectContaining({
        sessionId: 'session-fail',
        type: 'tool_failed',
        payload: { toolId: 'quote-price' },
      }),
    ]);
    expect(JSON.stringify(events.list())).not.toContain(USER_MESSAGE);
  });

  it('emits quote_issued when the stub chat agent quotes in a session', async () => {
    const events = new InMemoryAgentEvents();
    const sessions = new InMemoryChatSessions(() => 'session-stub');
    const { sessionId } = await sessions.create();
    await postChatMessage(
      sessions,
      new StubChatAgent(shopTools(events)),
      sessionId,
      'quote passenger_car komplet-5szt',
    );

    expect(events.list()).toEqual([
      expect.objectContaining({
        sessionId: 'session-stub',
        type: 'quote_issued',
        payload: { amount: 599, currency: 'PLN' },
      }),
    ]);
    expect(JSON.stringify(events.list())).not.toContain(USER_MESSAGE);
  });
});
