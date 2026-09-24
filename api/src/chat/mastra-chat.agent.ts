import type { Agent } from '@mastra/core/agent';
import type { AgentEventSink } from '../agent-events/agent-event';
import { recordAgentEvent } from '../agent-events/record-agent-event';
import { withTurnSession } from '../agent-events/turn-session-context';
import { createEvaTurnRequestContext } from '../mastra/eva-turn-request-context';
import type { IntentQualifier } from '../mastra/intents/intent-qualifier';
import type { IntentSessionState } from '../mastra/intents/intent-session-state';
import { logIntentTurnToConsole } from '../mastra/intents/intent-turn-log';
import {
  prepareIntentTurn,
  traceForTurn,
  type PreparedTurn,
} from '../mastra/intents/prepare-intent-turn';
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
    const prepared = await this.prepareTurn(message, sessionId);
    yield* withTurnSession(
      sessionId,
      this.streamPrepared(message, prepared),
      prepared.relatedBranches,
    );
  }

  private async prepareTurn(
    message: string,
    sessionId?: string,
  ): Promise<PreparedTurn> {
    const currentIntent =
      sessionId === undefined ? undefined : this.intentState.get(sessionId);
    const quoteWorkflow =
      sessionId === undefined
        ? undefined
        : this.intentState.getQuoteWorkflow(sessionId);
    const prepared = await prepareIntentTurn(this.qualifier, message, {
      currentIntent,
      quoteWorkflow,
      sessionId,
      log: logIntentTurnToConsole,
    });
    if (sessionId !== undefined) {
      this.intentState.set(sessionId, prepared.intent);
      this.intentState.setQuoteWorkflow(sessionId, prepared.quoteWorkflow);
    }
    recordAgentEvent(
      this.events,
      'intent_accepted',
      { intent: prepared.intent },
      sessionId,
    );
    recordAgentEvent(
      this.events,
      'decision_trace',
      traceForTurn(prepared),
      sessionId,
    );
    return prepared;
  }

  private async *streamPrepared(
    message: string,
    prepared: PreparedTurn,
  ): AsyncGenerator<string> {
    const output = await this.agent.stream(message, {
      maxSteps: prepared.profile.execution.maxToolCalls,
      requestContext: createEvaTurnRequestContext(prepared.intent, {
        toolIds: prepared.toolIds,
        executionNote: prepared.executionNote,
      }),
    });
    for await (const chunk of output.textStream) {
      if (typeof chunk === 'string' && chunk.length > 0) {
        yield chunk;
      }
    }
  }
}
