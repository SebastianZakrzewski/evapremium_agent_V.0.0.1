import { chooseExecution, type ExecutionChoice } from '../../domain/choose-execution';
import { decisionTracePayload } from '../../domain/decision-trace';
import { fewShotLinesForIntent } from '../../domain/leaf-retrieval-few-shot';
import {
  advanceQuoteVehicle,
  isSlotReply,
  type QuoteWorkflowSnapshot,
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
  relatedBranches: string[];
  executionNote?: string;
};

const MISSING_LABEL: Record<'car_brand' | 'car_model', string> = {
  car_brand: 'marki auta',
  car_model: 'modelu auta',
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
): ExecutionChoice {
  const config = alignedConfig(profile, result);
  if (config === undefined || result?.mode === undefined) {
    return { kind: 'profile' };
  }
  return chooseExecution({
    mode: result.mode,
    entities: result.entities ?? {},
    config,
  });
}

function executionNoteFor(
  execution: ExecutionChoice,
  entities: RouterEntities,
): string | undefined {
  if (execution.kind === 'tool') {
    return `Wykonanie: wywołaj ${execution.tool}.`;
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
  if (execution.kind !== 'workflow') {
    return undefined;
  }
  const advanced = advanceQuoteVehicle({ entities });
  return advanced.status === 'suspended' ? advanced.snapshot : undefined;
}

function assembledTurn(
  profile: IntentProfile,
  result?: QualifyResult,
): PreparedTurn {
  const execution = executionFor(profile, result);
  const entities = result?.entities ?? {};
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
  sessionId?: string;
  log?: (entry: IntentTurnLog) => void;
};

function emitTurnLog(
  options: PrepareIntentTurnOptions | undefined,
  turn: PreparedTurn,
  extra: Pick<IntentTurnLog, 'candidateIntent' | 'forcedOutOfScope'>,
): PreparedTurn {
  const execution = turn.execution;
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

export async function prepareIntentTurn(
  qualifier: IntentQualifier,
  message: string,
  options?: PrepareIntentTurnOptions,
): Promise<PreparedTurn> {
  if (
    options?.quoteWorkflow !== undefined &&
    isSlotReply(message)
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
  return emitTurnLog(
    options,
    assembledTurn(profileOrOutOfScope(accepted), acceptedResult),
    {
      candidateIntent: result.intent,
      forcedOutOfScope: false,
    },
  );
}
