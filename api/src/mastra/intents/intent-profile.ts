import type { ShopIntent, ShopToolId } from './schema';

export type IntentExecution = {
  mode: 'agent_loop';
  maxToolCalls: number;
};

export type IntentPermissions = {
  allowedActions: string[];
  forbiddenActions: string[];
};

export type IntentRouting = {
  allowIntentSwitch: boolean;
  allowedTransitions: ShopIntent[];
};

export type IntentFallback = {
  onLowConfidence: 'reclassify';
  onToolFailure: 'retry' | 'out_of_scope';
  onUnknownCase: 'out_of_scope';
};

export interface IntentProfile {
  readonly id: ShopIntent;
  readonly context: string;
  readonly instructions?: string;
  readonly tools: ShopToolId[];
  readonly execution: IntentExecution;
  readonly permissions: IntentPermissions;
  readonly routing?: IntentRouting;
  readonly fallback: IntentFallback;
}
