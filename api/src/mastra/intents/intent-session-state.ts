import type { ShopIntent } from './schema';

export const INTENT_SESSION_STATE = Symbol('INTENT_SESSION_STATE');

export interface IntentSessionState {
  get(sessionId: string): ShopIntent | undefined;
  set(sessionId: string, intent: ShopIntent): void;
}

export class InMemoryIntentSessionState implements IntentSessionState {
  private readonly intents = new Map<string, ShopIntent>();

  get(sessionId: string): ShopIntent | undefined {
    return this.intents.get(sessionId);
  }

  set(sessionId: string, intent: ShopIntent): void {
    this.intents.set(sessionId, intent);
  }
}
