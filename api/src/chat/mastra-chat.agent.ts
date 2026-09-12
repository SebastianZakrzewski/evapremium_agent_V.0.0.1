import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import type { Agent } from '@mastra/core/agent';
import { logIntentTurnToConsole } from '../mastra/intents/intent-turn-log';
import type { IntentQualifier } from '../mastra/intents/intent-qualifier';
import { prepareIntentTurn } from '../mastra/intents/prepare-intent-turn';
import type { IntentSessionState } from '../mastra/intents/intent-session-state';
import { createEvaTurnRequestContext } from '../mastra/eva-turn-request-context';

export class MastraChatAgent implements ChatAgent {
  constructor(
    private readonly agent: Pick<Agent, 'stream'>,
    private readonly qualifier: IntentQualifier,
    private readonly intentState: IntentSessionState,
  ) {}

  async handle(
    message: string,
    sessionId?: string,
  ): Promise<ChatAgentTurn> {
    let text = '';
    for await (const chunk of this.stream(message, sessionId)) {
      text += chunk;
    }
    return { text, data: { status: 'generated' } };
  }

  async *stream(
    message: string,
    sessionId?: string,
  ): AsyncIterable<string> {
    const currentIntent =
      sessionId === undefined ? undefined : this.intentState.get(sessionId);
    const prepared = await prepareIntentTurn(this.qualifier, message, {
      currentIntent,
      sessionId,
      log: logIntentTurnToConsole,
    });
    if (sessionId !== undefined) {
      this.intentState.set(sessionId, prepared.intent);
    }
    const output = await this.agent.stream(message, {
      maxSteps: prepared.profile.execution.maxToolCalls,
      requestContext: createEvaTurnRequestContext(prepared.intent),
    });
    for await (const chunk of output.textStream) {
      if (typeof chunk === 'string' && chunk.length > 0) {
        yield chunk;
      }
    }
  }
}
