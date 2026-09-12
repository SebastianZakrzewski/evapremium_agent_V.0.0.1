import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import { createEvaTurnAgent } from '../mastra/create-eva-mastra-agent';
import { prepareIntentTurn } from '../mastra/intents/prepare-intent-turn';
import type { IntentQualifier } from '../mastra/intents/intent-qualifier';
import type { IntentSessionState } from '../mastra/intents/intent-session-state';
import { ShopTools } from './shop-tools';

export class MastraChatAgent implements ChatAgent {
  constructor(
    private readonly shopTools: ShopTools,
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
    });
    if (sessionId !== undefined) {
      this.intentState.set(sessionId, prepared.intent);
    }
    const agent = createEvaTurnAgent(this.shopTools, prepared);
    const output = await agent.stream(message, {
      maxSteps: prepared.profile.execution.maxToolCalls,
    });
    for await (const chunk of output.textStream) {
      if (typeof chunk === 'string' && chunk.length > 0) {
        yield chunk;
      }
    }
  }
}
