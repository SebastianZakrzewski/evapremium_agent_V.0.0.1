import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import {
  CONTEXT_LEAF_SEARCH_FIXTURE,
  CONTEXT_LEAF_SEARCH_QUERIES,
} from '@api/context-tree/in-memory/context-leaf-search-fixture';
import { InMemoryContextLeafVectors } from '@api/context-tree/in-memory/in-memory-context-leaf-vectors';
import { MapTextEmbedder } from '@api/context-tree/in-memory/map-text-embedder';
import { InMemoryContextNodeCatalog } from '@api/context-tree/in-memory/in-memory-context-node-catalog';
import { ContextTreeResolver } from '@api/context-tree/context-tree.resolver';
import { ShopTools } from '@api/chat/shop-tools';
import { containerLogs } from '@api/agent-events/container-log-buffer';
import {
  clearLeafSearchMemory,
  formatTreeLookupLog,
  formatTreeSearchLog,
} from '@api/agent-events/tree-turn-log';
import { runWithTurnSession } from '@api/agent-events/turn-session-context';

describe('tree turn log', () => {
  it('prints branch rank and leaf lookup without the question or leaf body', () => {
    const search = formatTreeSearchLog(
      {
        sessionId: 'session-tree',
        preferredBranches: ['kolory'],
        rankedBranches: ['kolory', 'material'],
        leaves: [
          { slug: 'kolory-oferta', confidence: 'high' },
          { slug: 'material-eva', confidence: 'high' },
        ],
      },
      { color: false },
    );
    expect(search).toBe(
      [
        '[drzewo] sesja session-tree',
        '  gałęzie       kolory',
        '  ranking       kolory, material',
        '  liście        kolory-oferta, material-eva',
        '  pewność       wysoka',
      ].join('\n'),
    );

    const lookup = formatTreeLookupLog(
      {
        sessionId: 'session-tree',
        slug: 'material-eva',
        outcome: 'miss',
        agreement: 'listed',
      },
      { color: false },
    );
    expect(lookup).toBe(
      [
        '[drzewo] sesja session-tree',
        '  liść          material-eva',
        '  wynik         pudło',
        '  zgodność      w rankingu',
      ].join('\n'),
    );
    expect(`${search}\n${lookup}`).not.toMatch(/jakie kolory|Wysyłka/);
  });

  it('mirrors search and lookup in the process buffer', async () => {
    containerLogs.clear();
    clearLeafSearchMemory();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const tools = new ShopTools(
      undefined as never,
      undefined as never,
      new ContextTreeResolver(
        new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
        new MapTextEmbedder(CONTEXT_LEAF_SEARCH_QUERIES),
        new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE),
      ),
    );

    await runWithTurnSession(
      'session-tree',
      async () => {
        await tools.searchLeaves('kiedy wyślecie dywaniki');
        tools.lookupLeaf('dostawa');
        tools.lookupLeaf('pielegnacja');
      },
      ['info'],
    );

    const lines = containerLogs.list();
    expect(lines.map((line) => line.kind)).toEqual([
      'tree-search',
      'tree-lookup',
      'tree-lookup',
    ]);
    expect(lines[0]).toMatchObject({
      sessionId: 'session-tree',
      preferredBranches: ['info'],
      rankedBranches: ['info'],
      leaves: [{ slug: 'dostawa', confidence: 'high' }],
    });
    expect(lines[1]).toMatchObject({
      slug: 'dostawa',
      outcome: 'hit',
      agreement: 'top',
    });
    expect(lines[2]).toMatchObject({
      slug: 'pielegnacja',
      outcome: 'miss',
      agreement: 'outside',
    });
    expect(JSON.stringify(lines)).not.toContain('kiedy wyślecie');
    expect(JSON.stringify(lines)).not.toContain('Wysyłka w 5–7 dni');
    jest.restoreAllMocks();
    containerLogs.clear();
    clearLeafSearchMemory();
  });
});
