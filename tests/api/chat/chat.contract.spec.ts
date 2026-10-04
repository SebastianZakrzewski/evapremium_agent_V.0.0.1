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
import { InMemoryChatSessions, UnknownSessionError } from '@api/chat/chat-session';
import { acceptChatTurn, EmptyChatMessageError, openBudgetedChatSession } from '@api/chat/accept-chat-turn';
import { postChatMessage } from '@api/chat/post-chat-message';
import { chatCorsOrigins } from '@api/chat/shop-cors';
import { ShopTools } from '@api/chat/shop-tools';
import { StubChatAgent } from '@api/chat/stub-chat.agent';
import { configureChatHttp } from '@api/chat/configure-chat-http';
import { InMemoryChatTurnBudget, TurnBudgetExceededError } from '@api/chat/session-turn-budget';

describe('chat HTTP contract (tools → Nest services 1–3)', () => {
  const sessions = new InMemoryChatSessions(() => 'session-1');
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
  );
  const agent = new StubChatAgent(tools);

  it('creates a session then quotes via Nest pricing tool', async () => {
    const { sessionId } = await sessions.create();
    const result = await postChatMessage(
      sessions,
      agent,
      sessionId,
      'quote passenger_car komplet-5szt',
    );
    expect(result).toMatchObject({
      sessionId: 'session-1',
      text: 'quoted',
      data: { status: 'quoted', amount: 599, currency: 'PLN' },
    });
  });

  it('resolves a template through the cascade tool', async () => {
    const { sessionId } = await sessions.create();
    const result = await postChatMessage(
      sessions,
      agent,
      sessionId,
      'resolve vw golf 8 kombi 2021',
    );
    expect(result.data).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk8-wagon' },
    });
  });

  it('returns a context leaf and miss without invented copy', async () => {
    const { sessionId } = await sessions.create();
    const hit = await postChatMessage(sessions, agent, sessionId, 'leaf dostawa');
    expect(hit.data).toEqual({
      status: 'hit',
      slug: 'dostawa',
      title: 'Dostawa',
      body: 'Wysyłka w 5–7 dni roboczych.',
    });
    const miss = await postChatMessage(
      sessions,
      agent,
      sessionId,
      'leaf pielegnacja',
    );
    expect(miss.data).toEqual({ status: 'miss' });
    expect(miss.data).not.toHaveProperty('body');
  });

  it('rejects an unknown session', async () => {
    await expect(
      postChatMessage(sessions, agent, 'missing', 'leaf dostawa'),
    ).rejects.toBeInstanceOf(UnknownSessionError);
  });

  it('allows shop CORS origins', () => {
    expect(chatCorsOrigins()).toEqual([
      'https://evapremium.pl',
      'https://www.evapremium.pl',
    ]);
  });

  it('persists user and assistant messages on the session', async () => {
    const stored = new InMemoryChatSessions(() => 'session-persist');
    const { sessionId } = await stored.create();
    await postChatMessage(
      stored,
      agent,
      sessionId,
      'quote passenger_car komplet-5szt',
    );
    expect(await stored.listMessages(sessionId)).toEqual([
      {
        sessionId: 'session-persist',
        role: 'user',
        body: 'quote passenger_car komplet-5szt',
      },
      { sessionId: 'session-persist', role: 'assistant', body: 'quoted' },
    ]);
  });

  it('does not open a session when the guest session budget is spent', async () => {
    const stored = new InMemoryChatSessions(() => 'session-new');
    let creates = 0;
    const sessions = {
      create: async () => {
        creates += 1;
        return stored.create();
      },
      assertExists: (sessionId: string) => stored.assertExists(sessionId),
      appendMessage: stored.appendMessage.bind(stored),
      listMessages: (sessionId: string) => stored.listMessages(sessionId),
    };
    const ledger = guestBudget();
    const now = new Date('2026-10-04T03:10:00.000Z');
    for (let index = 0; index < 10; index += 1) {
      await openBudgetedChatSession(sessions, ledger, '203.0.113.30', now);
    }
    await expect(
      openBudgetedChatSession(sessions, ledger, '203.0.113.30', now),
    ).rejects.toBeInstanceOf(TurnBudgetExceededError);
    expect(creates).toBe(10);
  });

  it('keeps an unknown session at 404 and does not touch the ledger', async () => {
    const stored = new InMemoryChatSessions(() => 'session-known');
    const ledger = guestBudget();
    await expect(
      acceptChatTurn(stored, ledger, 'missing', 'cześć', '203.0.113.31'),
    ).rejects.toBeInstanceOf(UnknownSessionError);
    expect(await ledger.guestTurnCount('203.0.113.31', new Date())).toBe(0);
    expect(await ledger.sessionTurnCount('missing')).toBe(0);
  });

  it('rejects an empty message before the ledger', async () => {
    const stored = new InMemoryChatSessions(() => 'session-empty');
    const { sessionId } = await stored.create();
    const ledger = guestBudget();
    await expect(
      acceptChatTurn(stored, ledger, sessionId, '   ', '203.0.113.32'),
    ).rejects.toBeInstanceOf(EmptyChatMessageError);
    expect(await ledger.sessionTurnCount(sessionId)).toBe(0);
  });

  it('trusts one proxy hop so the guest address is req.ip', () => {
    const settings = new Map<string, unknown>();
    const expressApp = {
      set(key: string, value: unknown) {
        settings.set(key, value);
      },
    };
    configureChatHttp({
      getHttpAdapter: () => ({ getInstance: () => expressApp }),
      enableCors: () => undefined,
    } as never);
    expect(settings.get('trust proxy')).toBe(1);
  });
});

function guestBudget(): InMemoryChatTurnBudget {
  return new InMemoryChatTurnBudget({
    sessionTurns: 25,
    guestTurns: 40,
    guestSessions: 10,
    salt: 'test-salt',
  });
}
