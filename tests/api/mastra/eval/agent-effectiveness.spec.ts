import {
  aggregateEffectiveness,
  scoreScenario,
  type ScenarioTrace,
} from '@api/mastra/eval/agent-effectiveness';

describe('agent effectiveness scorer', () => {
  const scenario = {
    id: 'S3',
    message: 'Ile mam gwarancji?',
    expectedIntent: 'after_sales' as const,
    kind: 'faq' as const,
    quality: { mustMatch: /rok|roczn/i },
  };

  it('scores a clean FAQ search-then-lookup hit as all ones except maybe intent', () => {
    const trace: ScenarioTrace = {
      scenario,
      acceptedIntent: 'after_sales',
      answer: 'Gwarancja wynosi 1 rok.',
      calls: [
        {
          id: 'search-leaves',
          output: [{ slug: 'gwarancja', score: 0.6 }],
        },
        {
          id: 'lookup-leaf',
          input: { slug: 'gwarancja' },
          output: { status: 'hit', slug: 'gwarancja', body: '1 rok' },
        },
      ],
    };
    expect(scoreScenario(trace)).toEqual({
      m1_intent: 1,
      m2_tools_in_bounds: 1,
      m3_tool_scenario: 1,
      m4_no_slug_hallucination: 1,
      m5_no_fact_hallucination: 1,
      m6_answer_quality: 1,
      m7_loop_discipline: 1,
    });
  });

  it('fails slug hallucination and scenario when lookup is invented', () => {
    const trace: ScenarioTrace = {
      scenario,
      acceptedIntent: 'after_sales',
      answer: 'Zwrot w 14 dni.',
      calls: [
        {
          id: 'search-leaves',
          output: [],
        },
        {
          id: 'lookup-leaf',
          input: { slug: 'zwroty' },
          output: { status: 'miss' },
        },
      ],
    };
    const scores = scoreScenario(trace);
    expect(scores.m4_no_slug_hallucination).toBe(0);
    expect(scores.m3_tool_scenario).toBe(0);
    expect(scores.m5_no_fact_hallucination).toBe(0);
  });

  it('aggregates rates 0-100 and a weighted total', () => {
    const good: ScenarioTrace = {
      scenario,
      acceptedIntent: 'after_sales',
      answer: 'Gwarancja wynosi 1 rok.',
      calls: [
        {
          id: 'search-leaves',
          output: [{ slug: 'gwarancja', score: 0.6 }],
        },
        {
          id: 'lookup-leaf',
          input: { slug: 'gwarancja' },
          output: { status: 'hit', slug: 'gwarancja' },
        },
      ],
    };
    const report = aggregateEffectiveness([good, good], 'unit');
    expect(report.rates.m1_intent).toBe(100);
    expect(report.weighted).toBe(100);
  });
});
