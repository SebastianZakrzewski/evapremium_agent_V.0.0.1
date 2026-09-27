import { chooseExecution, type ExecutionChoice } from '../../domain/choose-execution';
import {
  advanceFitmentCascade,
  FITMENT_CASCADE_WORKFLOW,
  type FitmentCascadeAdvance,
  type FitmentCascadePort,
  type FitmentSnapshot,
} from '../../domain/fitment-session';
import { decisionTracePayload } from '../../domain/decision-trace';
import { fewShotLinesForIntent } from '../../domain/leaf-retrieval-few-shot';
import {
  advanceQuoteVehicle,
  advanceVehicleSlots,
  isSlotReply,
  type QuoteWorkflowSnapshot,
  type VehicleSlotKey,
} from '../../domain/quote-vehicle';
import {
  subIntentBySlug,
  type RouterEntities,
  type SubIntentConfig,
  type SubIntentSlug,
  type TurnMode,
} from '../../domain/sub-intent-catalog';
import { acceptIntentTransition } from './accept-intent-transition';
import type { IntentProfile } from './intent-profile';
import type { IntentQualifier } from './intent-qualifier';
import {
  isLowConfidence,
  outOfScopeProfile,
  profileOrOutOfScope,
} from './intent-fallback';
import type { IntentTurnLog } from './intent-turn-log';
import { executeQualifyStep } from './qualify-step';
import type { QualifyResult, ShopIntent, ShopToolId } from './schema';

export const EVA_TURN_BASE_INSTRUCTIONS =
  'Język: polski. Cena i fakt tylko z narzędzi Nest. Bez SQL. Bez kwoty spoza quote-price. Bez faktu spoza lookup-leaf.';

export type VerifiedProduct = {
  productId: string;
  brand: string;
  model: string;
};

export type PreparedTurn = {
  intent: ShopIntent;
  profile: IntentProfile;
  toolIds: ShopToolId[];
  instructions: string;
  subIntent: SubIntentSlug | null;
  mode: TurnMode | null;
  entities: RouterEntities;
  execution: ExecutionChoice;
  quoteWorkflow?: QuoteWorkflowSnapshot;
  fitment?: FitmentSnapshot;
  clearFitment?: boolean;
  cascadeMatch?: 'none' | 'one' | 'many';
  verifiedProduct?: VerifiedProduct;
  relatedBranches: string[];
  executionNote?: string;
};

const MISSING_LABEL: Record<VehicleSlotKey, string> = {
  car_brand: 'marki auta',
  car_model: 'modelu auta',
  year: 'rocznika',
  body_type: 'typu nadwozia',
};

export function assembleTurnInstructions(profile: IntentProfile): string {
  const fewShot = fewShotLinesForIntent(profile.id);
  const parts = [
    EVA_TURN_BASE_INSTRUCTIONS,
    profile.context,
    profile.instructions,
    fewShot.length > 0
      ? `Przykłady slugów z pytań klientów:\n${fewShot.join('\n')}`
      : undefined,
  ];
  return parts.filter((part): part is string => Boolean(part?.trim())).join('\n\n');
}

function clampTools(
  profile: IntentProfile,
  tools: readonly string[],
): ShopToolId[] {
  return profile.tools.filter((tool) => tools.includes(tool));
}

function toolsFor(
  profile: IntentProfile,
  execution: ExecutionChoice,
): ShopToolId[] {
  if (execution.kind === 'profile') {
    return [...profile.tools];
  }
  if (execution.kind === 'knowledge' || execution.kind === 'tool') {
    return clampTools(profile, execution.tools);
  }
  return [];
}

function alignedConfig(
  profile: IntentProfile,
  result: QualifyResult | undefined,
): SubIntentConfig | undefined {
  const slug = result?.sub_intent;
  if (slug == null) {
    return undefined;
  }
  const config = subIntentBySlug(slug);
  if (config === undefined || config.parentIntent !== profile.id) {
    return undefined;
  }
  return config;
}

function executionFor(
  profile: IntentProfile,
  result: QualifyResult | undefined,
  entities: RouterEntities,
): ExecutionChoice {
  const config = alignedConfig(profile, result);
  if (config === undefined || result?.mode === undefined) {
    return { kind: 'profile' };
  }
  return chooseExecution({
    mode: result.mode,
    entities,
    config,
  });
}

function executionNoteFor(
  execution: ExecutionChoice,
  entities: RouterEntities,
): string | undefined {
  if (execution.kind === 'tool' && execution.tool === 'quote-vehicle') {
    return `Wykonanie: wywołaj quote-vehicle z brand="${entities.car_brand ?? ''}", model="${entities.car_model ?? ''}", year=${entities.year ?? ''}, bodyType="${entities.body_type ?? ''}".`;
  }
  if (execution.kind === 'tool') {
    return `Wykonanie: wywołaj ${execution.tool}.`;
  }
  if (execution.kind === 'workflow' && execution.workflow === FITMENT_CASCADE_WORKFLOW) {
    return missingVehicleFact(entities);
  }
  if (execution.kind === 'workflow') {
    const advanced = advanceQuoteVehicle({ entities });
    const missing =
      advanced.status === 'suspended'
        ? MISSING_LABEL[advanced.missing]
        : 'danych auta';
    return `Brakuje ${missing}. Zapytaj o to. Nie wołaj quote-vehicle.`;
  }
  if (execution.kind === 'clarify') {
    return 'Dopytaj, o co chodzi. Nie wołaj narzędzi sklepu.';
  }
  return undefined;
}

function snapshotFor(
  execution: ExecutionChoice,
  entities: RouterEntities,
): QuoteWorkflowSnapshot | undefined {
  if (execution.kind !== 'workflow' || execution.workflow !== 'quote_vehicle') {
    return undefined;
  }
  const advanced = advanceQuoteVehicle({ entities });
  return advanced.status === 'suspended' ? advanced.snapshot : undefined;
}

function assembledTurn(
  profile: IntentProfile,
  result?: QualifyResult,
  message?: string,
): PreparedTurn {
  const entities = advanceVehicleSlots({
    slots: result?.entities ?? {},
    message,
  }).slots;
  const execution = executionFor(profile, result, entities);
  const config = alignedConfig(profile, result);
  const executionNote = executionNoteFor(execution, entities);
  const base = assembleTurnInstructions(profile);
  return {
    intent: profile.id,
    profile,
    toolIds: toolsFor(profile, execution),
    instructions: executionNote ? `${base}\n\n${executionNote}` : base,
    subIntent: config?.slug ?? null,
    mode: result?.mode ?? null,
    entities,
    execution,
    quoteWorkflow: snapshotFor(execution, entities),
    relatedBranches: config?.relatedBranches ?? [],
    executionNote,
  };
}

function resumeQuoteTurn(
  snapshot: QuoteWorkflowSnapshot,
  message: string,
): PreparedTurn {
  const advanced = advanceQuoteVehicle({
    entities: snapshot.entities,
    message,
  });
  const profile = profileOrOutOfScope('pricing');
  const entities =
    advanced.status === 'ready' ? advanced.entities : advanced.snapshot.entities;
  return assembledTurn(profile, {
    intent: 'pricing',
    confidence: 1,
    sub_intent: 'indicative_quote',
    mode: 'action',
    entities,
  });
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

export type PrepareIntentTurnOptions = {
  currentIntent?: ShopIntent;
  quoteWorkflow?: QuoteWorkflowSnapshot;
  fitment?: FitmentSnapshot;
  cascade?: FitmentCascadePort;
  sessionId?: string;
  log?: (entry: IntentTurnLog) => void;
};

function emitTurnLog(
  options: PrepareIntentTurnOptions | undefined,
  turn: PreparedTurn,
  extra: Pick<IntentTurnLog, 'candidateIntent' | 'forcedOutOfScope'>,
  keepFitment = false,
): PreparedTurn {
  const execution = turn.execution;
  if (options?.fitment && !keepFitment) {
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

function knownVehicleFact(slots: RouterEntities): string {
  const parts: string[] = [];
  if (slots.car_brand) {
    parts.push(`marka=${slots.car_brand}`);
  }
  if (slots.car_model) {
    parts.push(`model=${slots.car_model}`);
  }
  if (typeof slots.year === 'number') {
    parts.push(`rocznik=${slots.year}`);
  }
  if (slots.body_type) {
    parts.push(`nadwozie=${slots.body_type}`);
  }
  return parts.length > 0 ? ` Znane: ${parts.join(', ')}.` : '';
}

function missingVehicleFact(entities: RouterEntities): string | undefined {
  const collected = advanceVehicleSlots({ slots: entities });
  if (collected.missing === undefined) {
    return undefined;
  }
  return `Brakuje ${MISSING_LABEL[collected.missing]}.${knownVehicleFact(collected.slots)} Zapytaj tylko o brakujące. Nie wołaj resolve-template.`;
}

function rememberPartialFitment(entities: RouterEntities): FitmentSnapshot | undefined {
  const collected = advanceVehicleSlots({ slots: entities });
  const slots = collected.slots;
  const hasSlot =
    Boolean(slots.car_brand) ||
    Boolean(slots.car_model) ||
    typeof slots.year === 'number' ||
    Boolean(slots.body_type);
  if (collected.missing === undefined || !hasSlot) {
    return undefined;
  }
  return {
    workflow: FITMENT_CASCADE_WORKFLOW,
    step: 'waiting_for_vehicle',
    missing: collected.missing,
    slots,
  };
}

function verifiedProductFromCascade(
  advance: FitmentCascadeAdvance,
): VerifiedProduct | undefined {
  if (advance.status !== 'ready' || advance.result.status !== 'one') {
    return undefined;
  }
  const { template } = advance.result;
  const brand = template.brandKey.trim();
  const model = template.modelKey.trim();
  if (brand === '' || model === '') {
    return undefined;
  }
  return { productId: template.recordKey, brand, model };
}

function cascadeFact(advance: FitmentCascadeAdvance): string {
  if (advance.status === 'suspended') {
    return `Brakuje ${MISSING_LABEL[advance.snapshot.missing]}.${knownVehicleFact(advance.snapshot.slots)} Zapytaj tylko o brakujące. Nie wołaj resolve-template.`;
  }
  const result = advance.result;
  if (result.status === 'none') {
    return 'Kaskada: none. Nie ma szablonu dla tego auta. Nie wołaj resolve-template.';
  }
  if (result.status === 'one') {
    const template = result.template;
    return `Kaskada: one. recordKey=${template.recordKey}, brand=${template.brandKey}, model=${template.modelKey}, body=${template.bodyTypeKey ?? ''}. Nie wołaj resolve-template.`;
  }
  return `Kaskada: many (${result.templates.length}). Nie wołaj resolve-template.`;
}

function turnFromCascade(advance: FitmentCascadeAdvance): PreparedTurn {
  const profile = profileOrOutOfScope('product_info');
  const executionNote = cascadeFact(advance);
  const base = assembleTurnInstructions(profile);
  const suspended = advance.status === 'suspended';
  const knowledgeTools = ['lookup-leaf', 'search-leaves'] as const;
  const entities = suspended ? advance.snapshot.slots : {};
  return {
    intent: 'product_info',
    profile,
    toolIds: suspended ? [] : [...knowledgeTools],
    instructions: `${base}\n\n${executionNote}`,
    subIntent: 'fitment',
    mode: 'action',
    entities,
    execution: suspended
      ? { kind: 'workflow', workflow: FITMENT_CASCADE_WORKFLOW }
      : { kind: 'knowledge', tools: [...knowledgeTools] },
    fitment: suspended ? advance.snapshot : undefined,
    clearFitment: suspended ? undefined : true,
    cascadeMatch: suspended ? 'many' : advance.result.status,
    verifiedProduct: verifiedProductFromCascade(advance),
    relatedBranches: ['dopasowanie'],
    executionNote,
  };
}

async function resumeFitmentTurn(
  snapshot: FitmentSnapshot,
  message: string,
  cascade?: FitmentCascadePort,
): Promise<PreparedTurn> {
  const collected = advanceVehicleSlots({ slots: snapshot.slots, message });
  if (collected.missing !== undefined || cascade === undefined) {
    return turnFromCascade({
      status: 'suspended',
      snapshot: {
        workflow: FITMENT_CASCADE_WORKFLOW,
        step: 'waiting_for_vehicle',
        missing: collected.missing ?? snapshot.missing,
        slots: collected.slots,
      },
    });
  }
  return turnFromCascade(
    await advanceFitmentCascade({
      slots: collected.slots,
      resolve: (input) => cascade.resolve(input),
    }),
  );
}

export async function prepareIntentTurn(
  qualifier: IntentQualifier,
  message: string,
  options?: PrepareIntentTurnOptions,
): Promise<PreparedTurn> {
  const slotReply = isSlotReply(message);
  if (
    options?.fitment !== undefined &&
    options.quoteWorkflow === undefined &&
    slotReply
  ) {
    return emitTurnLog(
      options,
      await resumeFitmentTurn(options.fitment, message, options.cascade),
      { candidateIntent: 'product_info', forcedOutOfScope: false },
      true,
    );
  }

  if (
    options?.quoteWorkflow !== undefined &&
    slotReply
  ) {
    return emitTurnLog(options, resumeQuoteTurn(options.quoteWorkflow, message), {
      candidateIntent: 'pricing',
      forcedOutOfScope: false,
    });
  }

  let result = await qualifyOrOutOfScope(qualifier, message);
  if (result === 'out_of_scope') {
    return emitTurnLog(options, assembledTurn(outOfScopeProfile()), {
      forcedOutOfScope: true,
    });
  }

  if (isLowConfidence(result)) {
    result = await qualifyOrOutOfScope(qualifier, message);
    if (result === 'out_of_scope' || isLowConfidence(result)) {
      return emitTurnLog(options, assembledTurn(outOfScopeProfile()), {
        candidateIntent: result === 'out_of_scope' ? undefined : result.intent,
        forcedOutOfScope: true,
      });
    }
  }

  const accepted = acceptIntentTransition(
    options?.currentIntent,
    result.intent,
  );
  const acceptedResult =
    accepted === result.intent
      ? result
      : {
          intent: accepted,
          confidence: result.confidence,
          sub_intent: null,
          mode: 'knowledge' as const,
          entities: {},
        };
  let turn = assembledTurn(
    profileOrOutOfScope(accepted),
    acceptedResult,
    message,
  );
  if (
    turn.execution.kind === 'workflow' &&
    turn.execution.workflow === FITMENT_CASCADE_WORKFLOW
  ) {
    const missing = advanceVehicleSlots({ slots: turn.entities }).missing;
    if (missing !== undefined) {
      turn = {
        ...turn,
        fitment: {
          workflow: FITMENT_CASCADE_WORKFLOW,
          step: 'waiting_for_vehicle',
          missing,
          slots: turn.entities,
        },
      };
    } else if (options?.cascade) {
      turn = turnFromCascade(
        await advanceFitmentCascade({
          slots: turn.entities,
          resolve: (input) => options.cascade!.resolve(input),
        }),
      );
    }
  }
  if (turn.subIntent === 'fitment' && turn.fitment === undefined && !turn.clearFitment) {
    const fitment = rememberPartialFitment(turn.entities);
    if (fitment) {
      turn = { ...turn, fitment };
    }
  }
  return emitTurnLog(options, turn, {
    candidateIntent: result.intent,
    forcedOutOfScope: false,
  });
}
