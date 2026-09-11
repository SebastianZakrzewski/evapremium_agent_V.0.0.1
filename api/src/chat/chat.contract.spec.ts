import { CONTEXT_TREE_NODES } from '../context-tree/in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from '../context-tree/in-memory/in-memory-context-node-catalog';
import { ContextTreeResolver } from '../context-tree/context-tree.resolver';
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
import { PricingResolver } from '../pricing/pricing.resolver';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '../templates/in-memory/cascade-fixture';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from '../templates/in-memory/in-memory-catalogs';
import { TemplateCascadeResolver } from '../templates/template-cascade.resolver';
import { InMemoryChatSessions, UnknownSessionError } from './chat-session';
import { postChatMessage } from './post-chat-message';
import { SHOP_CORS_ORIGINS } from './shop-cors';
import { ShopTools } from './shop-tools';
import { StubChatAgent } from './stub-chat.agent';

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
    const { sessionId } = sessions.create();
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
    const { sessionId } = sessions.create();
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
    const { sessionId } = sessions.create();
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

  it('allows only shop CORS origins', () => {
    expect([...SHOP_CORS_ORIGINS]).toEqual([
      'https://evapremium.pl',
      'https://www.evapremium.pl',
    ]);
  });
});
