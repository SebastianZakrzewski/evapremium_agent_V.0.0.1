import type { FitmentSnapshot } from '../../domain/fitment-session';
import type { QuoteWorkflowSnapshot } from '../../domain/quote-vehicle';
import type { ShopIntent } from './schema';

export const INTENT_SESSION_STATE = Symbol('INTENT_SESSION_STATE');

export interface IntentSessionState {
  get(sessionId: string): ShopIntent | undefined;
  set(sessionId: string, intent: ShopIntent): void;
  getQuoteWorkflow(sessionId: string): QuoteWorkflowSnapshot | undefined;
  setQuoteWorkflow(
    sessionId: string,
    snapshot: QuoteWorkflowSnapshot | undefined,
  ): void;
  getFitment(sessionId: string): FitmentSnapshot | undefined;
  setFitment(sessionId: string, snapshot: FitmentSnapshot | undefined): void;
}

export class InMemoryIntentSessionState implements IntentSessionState {
  private readonly intents = new Map<string, ShopIntent>();
  private readonly quoteWorkflows = new Map<string, QuoteWorkflowSnapshot>();
  private readonly fitments = new Map<string, FitmentSnapshot>();

  get(sessionId: string): ShopIntent | undefined {
    return this.intents.get(sessionId);
  }

  set(sessionId: string, intent: ShopIntent): void {
    this.intents.set(sessionId, intent);
  }

  getQuoteWorkflow(sessionId: string): QuoteWorkflowSnapshot | undefined {
    return this.quoteWorkflows.get(sessionId);
  }

  setQuoteWorkflow(
    sessionId: string,
    snapshot: QuoteWorkflowSnapshot | undefined,
  ): void {
    if (snapshot === undefined) {
      this.quoteWorkflows.delete(sessionId);
      return;
    }
    this.quoteWorkflows.set(sessionId, snapshot);
  }

  getFitment(sessionId: string): FitmentSnapshot | undefined {
    return this.fitments.get(sessionId);
  }

  setFitment(sessionId: string, snapshot: FitmentSnapshot | undefined): void {
    if (snapshot === undefined) {
      this.fitments.delete(sessionId);
      return;
    }
    this.fitments.set(sessionId, snapshot);
  }
}
