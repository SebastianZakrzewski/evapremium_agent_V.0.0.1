import type { Agent } from '@mastra/core/agent';
import { recordAgentEvent } from '../agent-events/record-agent-event';
import type { FitmentCascadePort } from '../domain/fitment-session';
import { contactSlotsFromClient } from '../domain/collect-contact';
import {
  contextNeedForTurn,
  SessionClient,
  shouldRememberQualifierEntities,
} from '../domain/session-client';
import type { SessionClients } from './session-clients';
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
import type { TurnWorkflows } from '../mastra/intents/turn-workflows';
import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';

export class MastraChatAgent implements ChatAgent {
  private readonly verifiedBySession = new Map<string, VerifiedProduct>();

  constructor(
    private readonly agent: Pick<Agent, 'stream'>,
    private readonly qualifier: IntentQualifier,
    private readonly intentState: IntentSessionState,
    private readonly events?: AgentEventSink,
    private readonly cascade?: FitmentCascadePort,
    private readonly sessionClients?: SessionClients,
    private readonly workflows?: TurnWorkflows,
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
    const session = await this.readSession(sessionId);
    const prepared = await prepareIntentTurn(this.qualifier, message, {
      currentIntent: session.currentIntent,
      quoteWorkflow: session.quoteWorkflow,
      fitment: session.fitment,
      contactWorkflow: session.contactWorkflow,
      knownContact: session.client
        ? contactSlotsFromClient(session.client.data)
        : undefined,
      knownVehicle: session.client?.hasFacts() ? session.client.data : undefined,
      cascade: this.cascade,
      workflows: this.workflows,
      sessionId,
      log: logIntentTurnToConsole,
    });
    const withClient = await this.applySessionClient(
      message,
      sessionId,
      prepared,
      session.client,
    );
    await this.storeTurn(sessionId, withClient);
    this.recordTurn(sessionId, withClient);
    return withClient;
  }

  private async readSession(sessionId?: string): Promise<{
    currentIntent: ReturnType<IntentSessionState['get']>;
    quoteWorkflow: ReturnType<IntentSessionState['getQuoteWorkflow']>;
    fitment: ReturnType<IntentSessionState['getFitment']>;
    contactWorkflow: ReturnType<IntentSessionState['getContactWorkflow']>;
    client?: SessionClient;
  }> {
    if (sessionId === undefined) {
      return {
        currentIntent: undefined,
        quoteWorkflow: undefined,
        fitment: undefined,
        contactWorkflow: undefined,
      };
    }
    await this.intentState.load(sessionId);
    return {
      currentIntent: this.intentState.get(sessionId),
      quoteWorkflow: this.intentState.getQuoteWorkflow(sessionId),
      fitment: this.intentState.getFitment(sessionId),
      contactWorkflow: this.intentState.getContactWorkflow(sessionId),
      client:
        this.sessionClients === undefined
          ? undefined
          : await this.sessionClients.get(sessionId),
    };
  }

  private async storeTurn(sessionId: string | undefined, turn: PreparedTurn): Promise<void> {
    if (sessionId === undefined) {
      return;
    }
    if (turn.verifiedProduct) {
      this.verifiedBySession.set(sessionId, turn.verifiedProduct);
    } else {
      this.verifiedBySession.delete(sessionId);
    }
    this.intentState.set(sessionId, turn.intent);
    this.intentState.setQuoteWorkflow(sessionId, turn.quoteWorkflow);
    this.intentState.setContactWorkflow(sessionId, turn.contactWorkflow);
    if (turn.fitment) {
      this.intentState.setFitment(sessionId, turn.fitment);
    } else if (turn.clearFitment) {
      this.intentState.setFitment(sessionId, undefined);
    }
    await this.intentState.flush(sessionId);
  }

  private recordTurn(sessionId: string | undefined, turn: PreparedTurn): void {
    if (turn.cascadeMatch) {
      recordAgentEvent(
        this.events,
        'cascade_resolved',
        { match: turn.cascadeMatch },
        sessionId,
      );
    }
    recordAgentEvent(this.events, 'intent_accepted', { intent: turn.intent }, sessionId);
    recordAgentEvent(this.events, 'decision_trace', traceForTurn(turn), sessionId);
  }

  private async applySessionClient(
    message: string,
    sessionId: string | undefined,
    prepared: PreparedTurn,
    stored?: SessionClient,
  ): Promise<PreparedTurn> {
    if (sessionId === undefined || this.sessionClients === undefined) {
      return prepared;
    }
    const current = stored ?? SessionClient.empty(sessionId);
    const remembered = current
      .rememberUtterance(message, new Date().toISOString())
      .rememberVehicle({
        entities: shouldRememberQualifierEntities(prepared)
          ? prepared.entities
          : {},
        collectedSlots: prepared.collectedSlots,
        fitment: prepared.fitment,
        quoteEntities: prepared.quoteWorkflow?.entities,
        cascadeMatch: prepared.fitment ? undefined : prepared.cascadeMatch,
        verifiedProduct: prepared.verifiedProduct,
      });
    const next = prepared.contactSlots
      ? remembered.rememberContact(prepared.contactSlots)
      : remembered;
    if (next.hasFacts() && !next.equals(current)) {
      await this.sessionClients.save(next);
    }
    const note = next.note(
      contextNeedForTurn({
        intent: prepared.intent,
        subIntent: prepared.subIntent,
        execution: prepared.execution,
      }),
    );
    if (!note) {
      return prepared;
    }
    const executionNote = prepared.executionNote
      ? `${prepared.executionNote}\n${note}`
      : note;
    return { ...prepared, executionNote };
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
