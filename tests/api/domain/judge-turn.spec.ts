import { judgeTurn } from '@api/domain/judge-turn';

const USER_TEXT = 'Jakie są kolory dywaników? +48 600';

describe('judgeTurn', () => {
  it('passes a high-confidence lookup of the first slug', () => {
    const judgment = judgeTurn({
      intent: 'product_info',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [{ slugs: ['kolory', 'material-eva'], confidence: 'high' }],
      lookups: [{ slug: 'kolory', agreement: 'top', outcome: 'hit' }],
      tools: ['search-leaves', 'lookup-leaf'],
    });

    expect(judgment.verdict).toBe('pass');
    expect(judgment.retrieval).toBe('pass');
    expect(judgment.action).toBe('pass');
    expect(judgment.codes).toEqual([]);
    expect(judgment.slugs).toEqual(['kolory', 'material-eva']);
    expect(JSON.stringify(judgment)).not.toContain(USER_TEXT);
  });

  it('fails when high confidence lookup is not first or the slug is outside the list', () => {
    const listed = judgeTurn({
      intent: 'product_info',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [{ slugs: ['kolory', 'material-eva'], confidence: 'high' }],
      lookups: [{ slug: 'material-eva', agreement: 'listed', outcome: 'hit' }],
      tools: ['search-leaves', 'lookup-leaf'],
    });
    const outside = judgeTurn({
      intent: 'product_info',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [{ slugs: ['kolory'], confidence: 'ambiguous' }],
      lookups: [{ slug: 'wymyslony', agreement: 'outside', outcome: 'miss' }],
      tools: ['search-leaves', 'lookup-leaf'],
    });

    expect(listed.verdict).toBe('fail');
    expect(listed.codes).toEqual(['lookup_not_top']);
    expect(outside.codes).toEqual(['lookup_outside']);
  });

  it('accepts a listed slug when confidence is ambiguous and a miss inside the list', () => {
    const judgment = judgeTurn({
      intent: 'after_sales',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [{ slugs: ['gwarancja', 'reklamacja'], confidence: 'ambiguous' }],
      lookups: [{ slug: 'reklamacja', agreement: 'listed', outcome: 'miss' }],
      tools: ['search-leaves', 'lookup-leaf'],
    });

    expect(judgment.retrieval).toBe('pass');
    expect(judgment.verdict).toBe('pass');
  });

  it('fails knowledge turns with no search, a second search, or hits without lookup', () => {
    const missing = judgeTurn({
      intent: 'delivery',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [],
      lookups: [],
      tools: [],
    });
    const twice = judgeTurn({
      intent: 'delivery',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [
        { slugs: ['dostawa'], confidence: 'high' },
        { slugs: ['dostawa'], confidence: 'high' },
      ],
      lookups: [{ slug: 'dostawa', agreement: 'top', outcome: 'hit' }],
      tools: ['search-leaves', 'lookup-leaf', 'search-leaves'],
    });
    const noLookup = judgeTurn({
      intent: 'delivery',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [{ slugs: ['dostawa'], confidence: 'high' }],
      lookups: [],
      tools: ['search-leaves'],
    });

    expect(missing.codes).toEqual(['no_search']);
    expect(twice.codes).toContain('second_search');
    expect(noLookup.codes).toEqual(['no_lookup']);
  });

  it('passes an empty search without lookup and skips retrieval on a greeting profile', () => {
    const empty = judgeTurn({
      intent: 'product_info',
      execution: 'knowledge',
      allowedTools: ['search-leaves', 'lookup-leaf'],
      searches: [{ slugs: [], confidence: undefined }],
      lookups: [],
      tools: ['search-leaves'],
    });
    const greeting = judgeTurn({
      intent: 'product_info',
      execution: 'profile',
      allowedTools: ['search-leaves', 'lookup-leaf', 'resolve-template'],
      searches: [],
      lookups: [],
      tools: [],
    });

    expect(empty.retrieval).toBe('pass');
    expect(empty.verdict).toBe('pass');
    expect(greeting.retrieval).toBe('skipped');
    expect(greeting.action).toBe('pass');
    expect(greeting.verdict).toBe('pass');
  });

  it('passes the expected pricing tool without a quote and fails a tool outside the profile', () => {
    const quoted = judgeTurn({
      intent: 'pricing',
      execution: 'tool',
      allowedTools: ['quote-vehicle'],
      expectedTool: 'quote-vehicle',
      searches: [],
      lookups: [],
      tools: ['quote-vehicle'],
    });
    const stray = judgeTurn({
      intent: 'out_of_scope',
      execution: 'profile',
      allowedTools: [],
      searches: [],
      lookups: [],
      tools: ['search-leaves'],
    });
    const missingTool = judgeTurn({
      intent: 'pricing',
      execution: 'tool',
      allowedTools: ['quote-vehicle'],
      expectedTool: 'quote-vehicle',
      searches: [],
      lookups: [],
      tools: [],
    });

    expect(quoted.retrieval).toBe('skipped');
    expect(quoted.action).toBe('pass');
    expect(quoted.verdict).toBe('pass');
    expect(stray.codes).toEqual(['tool_out_of_profile']);
    expect(stray.retrieval).toBe('skipped');
    expect(missingTool.codes).toEqual(['missing_tool']);
  });

  it('passes a workflow and clarify turn that called no tools', () => {
    const workflow = judgeTurn({
      intent: 'pricing',
      execution: 'workflow',
      allowedTools: [],
      searches: [],
      lookups: [],
      tools: [],
    });
    const clarify = judgeTurn({
      intent: 'product_info',
      execution: 'clarify',
      allowedTools: [],
      searches: [],
      lookups: [],
      tools: [],
    });

    expect(workflow.verdict).toBe('pass');
    expect(workflow.retrieval).toBe('skipped');
    expect(clarify.verdict).toBe('pass');
  });
});
