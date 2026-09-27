import type { Agent } from '@mastra/core/agent';
import { recordAgentEvent } from '../agent-events/record-agent-event';
import type { FitmentCascadePort } from '../domain/fitment-session';
import type { AgentEventSink } from '../agent-events/agent-event';
import { recordTurnJudgment } from '../agent-events/record-turn-judgment';
import { beginTurnTrace } from '../agent-events/turn-trace';
import { withTurnSession } from '../agent-events/turn-session-context';
import { createEvaTurnRequestContext } from '../mastra/eva-turn-request-context';
import type { IntentQualifier } from '../mastra/intents/intent-qualifier';
import type { IntentSessionState } from '../mastra/intents/intent-session-state';
import { logIntentTurnToConsole } from '../mastra/intents/intent-turn-log';
import {
  prepareIntentTurn,
  traceForTurn,
  type PreparedTurn,
  type VerifiedProduct,
} from '../mastra/intents/prepare-intent-turn';
import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';

export class MastraChatAgent implements ChatAgent {
  private readonly verifiedBySession = new Map<string, VerifiedProduct>();

  constructor(
    private readonly agent: Pick<Agent, 'stream'>,
    private readonly qualifier: IntentQualifier,
    private readonly intentState: IntentSessionState,
    private readonly events?: AgentEventSink,
    private readonly cascade?: FitmentCascadePort,
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

  verifiedProduct(sessionId?: string): VerifiedProduct | undefined {
    if (sessionId === undefined) {
      return undefined;
    }
    return this.verifiedBySession.get(sessionId);
  }

  async *stream(
    message: string,
    sessionId?: string,
  ): AsyncIterable<string> {
    const prepared = await this.prepareTurn(message, sessionId);
    if (sessionId !== undefined) {
      beginTurnTrace(sessionId);
    }
    try {
      yield* withTurnSession(
        sessionId,
        this.streamPrepared(message, prepared),
        prepared.relatedBranches,
      );
    } finally {
      if (sessionId !== undefined) {
        recordTurnJudgment(this.events, sessionId, {
          intent: prepared.intent,
          execution: prepared.execution,
          allowedTools: prepared.toolIds,
        });
      }
    }
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
    const fitment =
      sessionId === undefined
        ? undefined
        : this.intentState.getFitment(sessionId);
    const prepared = await prepareIntentTurn(this.qualifier, message, {
      currentIntent,
      quoteWorkflow,
      fitment,
      cascade: this.cascade,
      sessionId,
      log: logIntentTurnToConsole,
    });
    if (sessionId !== undefined) {
      if (prepared.verifiedProduct) {
        this.verifiedBySession.set(sessionId, prepared.verifiedProduct);
      } else {
        this.verifiedBySession.delete(sessionId);
      }
      this.intentState.set(sessionId, prepared.intent);
      this.intentState.setQuoteWorkflow(sessionId, prepared.quoteWorkflow);
      if (prepared.fitment) {
        this.intentState.setFitment(sessionId, prepared.fitment);
      } else if (prepared.clearFitment) {
        this.intentState.setFitment(sessionId, undefined);
      }
    }
    if (prepared.cascadeMatch) {
      recordAgentEvent(
        this.events,
        'cascade_resolved',
        { match: prepared.cascadeMatch },
        sessionId,
      );
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
