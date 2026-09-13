import type { Agent } from '@mastra/core/agent';
import type { AgentEventSink } from '../agent-events/agent-event';
import { recordAgentEvent } from '../agent-events/record-agent-event';
import { withTurnSession } from '../agent-events/turn-session-context';
import { createEvaTurnRequestContext } from '../mastra/eva-turn-request-context';
import type { IntentQualifier } from '../mastra/intents/intent-qualifier';
import type { IntentSessionState } from '../mastra/intents/intent-session-state';
import { logIntentTurnToConsole } from '../mastra/intents/intent-turn-log';
import { prepareIntentTurn } from '../mastra/intents/prepare-intent-turn';
import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';

export class MastraChatAgent implements ChatAgent {
  constructor(
    private readonly agent: Pick<Agent, 'stream'>,
    private readonly qualifier: IntentQualifier,
    private readonly intentState: IntentSessionState,
    private readonly events?: AgentEventSink,
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
    yield* withTurnSession(sessionId, this.streamTurn(message, sessionId));
  }

  private async *streamTurn(
    message: string,
    sessionId?: string,
  ): AsyncGenerator<string> {
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
    recordAgentEvent(
      this.events,
      'intent_accepted',
      { intent: prepared.intent },
      sessionId,
    );
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
