import { decisionTracePayload } from '../../domain/decision-trace';
import {
  conflictsWithStoredVehicle,
  type SessionClientData,
} from '../../domain/session-client';
import type {
  FitmentCascadePort,
  FitmentSnapshot,
} from '../../domain/fitment-session';
import {
  advanceVehicleSlots,
  type QuoteWorkflowSnapshot,
} from '../../domain/quote-vehicle';
import type { RouterEntities } from '../../domain/sub-intent-catalog';
import { verifiedProductFromStoredKeys } from '../../domain/verified-product';
import { acceptIntentTransition } from './accept-intent-transition';
import {
  assembleTurnInstructions,
  assembledTurn,
  type PreparedTurn,
} from './assemble-prepared-turn';
import { evaTurnWorkflows } from './eva-turn-workflows';
import {
  isLowConfidence,
  outOfScopeProfile,
  profileOrOutOfScope,
} from './intent-fallback';
import type { IntentQualifier } from './intent-qualifier';
import type { IntentTurnLog } from './intent-turn-log';
import { executeQualifyStep } from './qualify-step';
import type { QualifyResult, ShopIntent } from './schema';
import type { TurnWorkflows } from './turn-workflows';

export {
  assembleTurnInstructions,
  EVA_TURN_BASE_INSTRUCTIONS,
  type PreparedTurn,
  type VerifiedProduct,
} from './assemble-prepared-turn';

export type KnownSessionVehicle = Pick<
  SessionClientData,
  | 'carBrand'
  | 'carModel'
  | 'year'
  | 'bodyType'
  | 'cascadeStatus'
  | 'brandKey'
  | 'modelKey'
  | 'bodyTypeKey'
  | 'templateRecordKey'
>;

export type PrepareIntentTurnOptions = {
  currentIntent?: ShopIntent;
  quoteWorkflow?: QuoteWorkflowSnapshot;
  fitment?: FitmentSnapshot;
  knownVehicle?: KnownSessionVehicle;
  cascade?: FitmentCascadePort;
  workflows?: TurnWorkflows;
  sessionId?: string;
  log?: (entry: IntentTurnLog) => void;
};

const FAQ_SUB_INTENTS = new Set([
  'available_colors',
  'material',
  'delivery_info',
  'complaint_info',
]);

type Qualification =
  | { kind: 'out_of_scope'; candidateIntent?: ShopIntent }
  | { kind: 'ready'; result: QualifyResult };

export async function prepareIntentTurn(
  qualifier: IntentQualifier,
  message: string,
  options?: PrepareIntentTurnOptions,
): Promise<PreparedTurn> {
  const workflows = options?.workflows ?? evaTurnWorkflows(options?.cascade);
  const resumed = await workflows.resume(message, options ?? {});
  if (resumed) {
    return emitTurnLog(
      options,
      resumed.turn,
      { candidateIntent: resumed.candidateIntent, forcedOutOfScope: false },
      resumed.keepOpenWorkflow,
    );
  }

  const qualification = await qualifyTurn(qualifier, message);
  if (qualification.kind === 'out_of_scope') {
    return emitTurnLog(options, assembledTurn(outOfScopeProfile()), {
      candidateIntent: qualification.candidateIntent,
      forcedOutOfScope: true,
    });
  }

  const accepted = acceptQualifiedIntent(options?.currentIntent, qualification.result);
  const drafted = assembledTurn(
    profileOrOutOfScope(accepted.intent),
    accepted.result,
    message,
  );
  const remembered = rememberKnownVehicle(drafted, message, options?.knownVehicle);
  const continued = await workflows.continueTurn(
    remembered.turn,
    options ?? {},
    remembered.resolved,
  );
  return emitTurnLog(options, continued, {
    candidateIntent: qualification.result.intent,
    forcedOutOfScope: false,
  });
}

export function traceForTurn(turn: PreparedTurn): Record<string, string | null> {
  return decisionTracePayload({
    intent: turn.intent,
    subIntent: turn.subIntent,
    mode: turn.mode,
    execution: turn.execution.kind,
    tool: turn.execution.kind === 'tool' ? turn.execution.tool : undefined,
    workflow:
      turn.execution.kind === 'workflow' ? turn.execution.workflow : undefined,
  });
}

async function qualifyTurn(
  qualifier: IntentQualifier,
  message: string,
): Promise<Qualification> {
  const first = await qualifyOrOutOfScope(qualifier, message);
  if (first === 'out_of_scope') {
    return { kind: 'out_of_scope' };
  }
  if (!isLowConfidence(first)) {
    return { kind: 'ready', result: first };
  }
  const retry = await qualifyOrOutOfScope(qualifier, message);
  if (retry === 'out_of_scope' || isLowConfidence(retry)) {
    return {
      kind: 'out_of_scope',
      candidateIntent: retry === 'out_of_scope' ? undefined : retry.intent,
    };
  }
  return { kind: 'ready', result: retry };
}

async function qualifyOrOutOfScope(
  qualifier: IntentQualifier,
  message: string,
): Promise<QualifyResult | 'out_of_scope'> {
  try {
    return await executeQualifyStep(qualifier, { message });
  } catch {
    return 'out_of_scope';
  }
}

function acceptQualifiedIntent(
  currentIntent: ShopIntent | undefined,
  result: QualifyResult,
): { intent: ShopIntent; result: QualifyResult } {
  const intent = acceptIntentTransition(currentIntent, result.intent);
  if (intent === result.intent) {
    return { intent, result };
  }
  return {
    intent,
    result: {
      intent,
      confidence: result.confidence,
      sub_intent: null,
      mode: 'knowledge',
      entities: {},
    },
  };
}

function rememberKnownVehicle(
  turn: PreparedTurn,
  message: string,
  known: KnownSessionVehicle | undefined,
): { turn: PreparedTurn; resolved: boolean } {
  if (
    known === undefined ||
    isFaqSubIntent(turn.subIntent) ||
    conflictsWithStoredVehicle(message, turn.entities, known)
  ) {
    return { turn, resolved: false };
  }
  const merged: PreparedTurn = {
    ...turn,
    entities: mergeKnownVehicle(message, turn.entities, known),
  };
  if (!isResolvedVehicle(known, merged.entities)) {
    return { turn: merged, resolved: false };
  }
  return { turn: turnFromKnownVehicle(merged, known), resolved: true };
}

function isFaqSubIntent(subIntent: string | null): boolean {
  return subIntent !== null && FAQ_SUB_INTENTS.has(subIntent);
}

function mergeKnownVehicle(
  message: string,
  entities: RouterEntities,
  known: KnownSessionVehicle,
): RouterEntities {
  const spoken = message.trim().toLowerCase();
  const brand =
    entities.car_brand?.trim().toLowerCase() === spoken
      ? undefined
      : entities.car_brand;
  const model =
    entities.car_model?.trim().toLowerCase() === spoken
      ? undefined
      : entities.car_model;
  return {
    car_brand: brand ?? known.carBrand,
    car_model: model ?? known.carModel,
    year: entities.year ?? known.year,
    body_type: entities.body_type ?? known.bodyType,
  };
}

function isResolvedVehicle(
  known: KnownSessionVehicle,
  entities: RouterEntities,
): boolean {
  return (
    known.cascadeStatus === 'one' &&
    Boolean(known.templateRecordKey) &&
    advanceVehicleSlots({ slots: entities }).missing === undefined
  );
}

function turnFromKnownVehicle(
  turn: PreparedTurn,
  known: KnownSessionVehicle,
): PreparedTurn {
  const knowledgeTools = ['lookup-leaf', 'search-leaves'] as const;
  const note = [
    `Auto sesji: marka=${known.carBrand ?? ''}, model=${known.carModel ?? ''}, rocznik=${known.year ?? ''}, nadwozie=${known.bodyType ?? ''}.`,
    `Kaskada: one. recordKey=${known.templateRecordKey}, brand=${known.brandKey ?? ''}, model=${known.modelKey ?? ''}, body=${known.bodyTypeKey ?? ''}.`,
    'Nie wołaj resolve-template. Nie pytaj ponownie o markę, model, rok ani nadwozie.',
  ].join(' ');
  const base = assembleTurnInstructions(turn.profile);
  return {
    ...turn,
    toolIds: [...knowledgeTools],
    instructions: `${base}\n\n${note}`,
    execution: { kind: 'knowledge', tools: [...knowledgeTools] },
    executionNote: note,
    fitment: undefined,
    clearFitment: true,
    collectedSlots: turn.entities,
    verifiedProduct: verifiedProductFromStoredKeys({
      productId: known.templateRecordKey,
      brandKey: known.brandKey,
      modelKey: known.modelKey,
      bodyTypeKey: known.bodyTypeKey,
    }),
  };
}

function emitTurnLog(
  options: PrepareIntentTurnOptions | undefined,
  turn: PreparedTurn,
  extra: Pick<IntentTurnLog, 'candidateIntent' | 'forcedOutOfScope'>,
  keepOpenWorkflow = false,
): PreparedTurn {
  const execution = turn.execution;
  if (options?.fitment && !keepOpenWorkflow) {
    turn = { ...turn, clearFitment: true };
  }
  options?.log?.({
    sessionId: options.sessionId,
    currentIntent: options.currentIntent,
    candidateIntent: extra.candidateIntent,
    acceptedIntent: turn.intent,
    subIntent: turn.subIntent,
    mode: turn.mode,
    execution: execution.kind,
    executionTarget:
      execution.kind === 'tool'
        ? execution.tool
        : execution.kind === 'workflow'
          ? execution.workflow
          : undefined,
    tools: turn.toolIds,
    forcedOutOfScope: extra.forcedOutOfScope,
  });
  return turn;
}
