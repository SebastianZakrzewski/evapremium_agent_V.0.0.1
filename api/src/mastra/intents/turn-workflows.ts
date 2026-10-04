import type { ContactWorkflowSnapshot } from '../../domain/collect-contact';
import type { FitmentCascadePort, FitmentSnapshot } from '../../domain/fitment-session';
import type { QuoteWorkflowSnapshot } from '../../domain/quote-vehicle';
import type { PreparedTurn } from './assemble-prepared-turn';
import type { ShopIntent } from './schema';

export const TURN_WORKFLOWS = Symbol('TURN_WORKFLOWS');

export type TurnWorkflowContext = {
  quoteWorkflow?: QuoteWorkflowSnapshot;
  fitment?: FitmentSnapshot;
  contactWorkflow?: ContactWorkflowSnapshot;
  cascade?: FitmentCascadePort;
};

export type ResumedWorkflow = {
  turn: PreparedTurn;
  candidateIntent: ShopIntent;
  keepOpenWorkflow: boolean;
};

export type TurnWorkflows = {
  resume(
    message: string,
    context: TurnWorkflowContext,
  ): Promise<ResumedWorkflow | undefined>;
  continueTurn(
    turn: PreparedTurn,
    context: TurnWorkflowContext,
    resolved: boolean,
  ): Promise<PreparedTurn>;
};
