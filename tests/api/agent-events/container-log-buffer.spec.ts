import {
  ContainerLogBuffer,
  containerLogs,
} from '@api/agent-events/container-log-buffer';
import { executeShopTool } from '@api/agent-events/execute-shop-tool';
import { logIntentTurnToConsole } from '@api/mastra/intents/intent-turn-log';

describe('container log buffer', () => {
  it('keeps an intent block and a tool line in order, without message text', () => {
    const buffer = new ContainerLogBuffer();
    const now = new Date('2026-09-24T00:50:00.000Z');
    buffer.appendIntent(
      {
        sessionId: 'session-1',
        currentIntent: 'product_info',
        candidateIntent: 'delivery',
        acceptedIntent: 'delivery',
        tools: ['search-leaves', 'lookup-leaf'],
        forcedOutOfScope: false,
      },
      now,
    );
    buffer.appendTool('search-leaves', new Date('2026-09-24T00:50:01.000Z'));

    const lines = buffer.list();
    expect(lines.map((line) => line.kind)).toEqual(['intent-turn', 'tool']);
    expect(lines[0]).toMatchObject({
      seq: 1,
      sessionId: 'session-1',
      currentIntent: 'product_info',
      subIntent: null,
      mode: null,
      execution: 'profile',
      tools: ['search-leaves', 'lookup-leaf'],
    });
    expect(JSON.stringify(lines)).not.toContain('ile kosztuje');
    expect(buffer.list(1)).toEqual([
      expect.objectContaining({ seq: 2, kind: 'tool', toolId: 'search-leaves' }),
    ]);
  });

  it('records the console intent block and the used-tool line in the process buffer', async () => {
    containerLogs.clear();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    logIntentTurnToConsole({
      sessionId: 'session-log',
      acceptedIntent: 'pricing',
      tools: ['quote-price'],
      forcedOutOfScope: false,
    });
    await executeShopTool(undefined, 'quote-price', () => 'ok');

    expect(containerLogs.list().map((line) => line.kind)).toEqual([
      'intent-turn',
      'tool',
    ]);
    jest.restoreAllMocks();
    containerLogs.clear();
  });
});
