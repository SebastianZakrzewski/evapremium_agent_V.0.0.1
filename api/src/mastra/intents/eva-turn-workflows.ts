import {
  advanceFitmentCascade,
  FITMENT_CASCADE_WORKFLOW,
  type FitmentCascadeAdvance,
  type FitmentCascadePort,
  type FitmentSnapshot,
} from '../../domain/fitment-session';
import {
  advanceQuoteVehicle,
  advanceVehicleSlots,
  isSlotReply,
  type QuoteWorkflowSnapshot,
} from '../../domain/quote-vehicle';
import { verifiedProductFromTemplate } from '../../domain/verified-product';
import {
  assembleTurnInstructions,
  assembledTurn,
  knownVehicleFact,
  missingSlotLabel,
  type PreparedTurn,
} from './assemble-prepared-turn';
import { profileOrOutOfScope } from './intent-fallback';
import type {
  ResumedWorkflow,
  TurnWorkflowContext,
  TurnWorkflows,
} from './turn-workflows';

const KNOWLEDGE_TOOLS = ['lookup-leaf', 'search-leaves'] as const;

export function evaTurnWorkflows(
  cascade?: FitmentCascadePort,
): TurnWorkflows {
  return {
    resume(message, context) {
      return resumeOpenWorkflow(message, context, cascade ?? context.cascade);
    },
    continueTurn(turn, context, resolved) {
      return continueWorkflow(turn, cascade ?? context.cascade, resolved);
    },
  };
}

async function resumeOpenWorkflow(
  message: string,
  context: TurnWorkflowContext,
  cascade?: FitmentCascadePort,
): Promise<ResumedWorkflow | undefined> {
  if (!isSlotReply(message)) {
    return undefined;
  }
  if (context.fitment !== undefined && context.quoteWorkflow === undefined) {
    return {
      turn: await resumeFitmentTurn(context.fitment, message, cascade),
      candidateIntent: 'product_info',
      keepOpenWorkflow: true,
    };
  }
  if (context.quoteWorkflow !== undefined) {
    return {
      turn: resumeQuoteTurn(context.quoteWorkflow, message),
      candidateIntent: 'pricing',
      keepOpenWorkflow: false,
    };
  }
  return undefined;
}

async function continueWorkflow(
  turn: PreparedTurn,
  cascade: FitmentCascadePort | undefined,
  resolved: boolean,
): Promise<PreparedTurn> {
  let next = turn;
  if (!resolved && isFitmentWorkflow(next)) {
    next = await advanceFitmentTurn(next, cascade);
  }
  return rememberPartialFitment(next);
}

function isFitmentWorkflow(turn: PreparedTurn): boolean {
  return (
    turn.execution.kind === 'workflow' &&
    turn.execution.workflow === FITMENT_CASCADE_WORKFLOW
  );
}

async function advanceFitmentTurn(
  turn: PreparedTurn,
  cascade: FitmentCascadePort | undefined,
): Promise<PreparedTurn> {
  if (cascade === undefined) {
    const missing = advanceVehicleSlots({ slots: turn.entities }).missing;
    if (missing !== undefined) {
      return {
        ...turn,
        fitment: {
          workflow: FITMENT_CASCADE_WORKFLOW,
          step: 'waiting_for_vehicle',
          missing,
          slots: turn.entities,
        },
      };
    }
    return turn;
  }
  const slots = turn.entities;
  return {
    ...turnFromCascade(
      await advanceFitmentCascade({
        slots,
        resolve: (input) => cascade.resolve(input),
        aliases: cascade.listAliases(),
      }),
    ),
    collectedSlots: slots,
  };
}

function rememberPartialFitment(turn: PreparedTurn): PreparedTurn {
  if (turn.subIntent !== 'fitment' || turn.fitment !== undefined || turn.clearFitment) {
    return turn;
  }
  const fitment = partialFitment(turn);
  return fitment ? { ...turn, fitment } : turn;
}

function partialFitment(turn: PreparedTurn): FitmentSnapshot | undefined {
  const collected = advanceVehicleSlots({ slots: turn.entities });
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

function resumeQuoteTurn(
  snapshot: QuoteWorkflowSnapshot,
  message: string,
): PreparedTurn {
  const advanced = advanceQuoteVehicle({
    entities: snapshot.entities,
    message,
  });
  const entities =
    advanced.status === 'ready' ? advanced.entities : advanced.snapshot.entities;
  return assembledTurn(profileOrOutOfScope('pricing'), {
    intent: 'pricing',
    confidence: 1,
    sub_intent: 'indicative_quote',
    mode: 'action',
    entities,
  });
}

async function resumeFitmentTurn(
  snapshot: FitmentSnapshot,
  message: string,
  cascade?: FitmentCascadePort,
): Promise<PreparedTurn> {
  if (cascade === undefined) {
    const collected = advanceVehicleSlots({ slots: snapshot.slots, message });
    return turnFromCascade({
      status: 'suspended',
      snapshot: {
        workflow: FITMENT_CASCADE_WORKFLOW,
        step: 'waiting_for_vehicle',
        missing: collected.missing ?? snapshot.missing,
        slots: collected.slots,
        options: snapshot.options,
      },
    });
  }
  const advance = await advanceFitmentCascade({
    slots: snapshot.slots,
    message,
    asked: snapshot.missing,
    resolve: (input) => cascade.resolve(input),
    aliases: cascade.listAliases(),
  });
  return {
    ...turnFromCascade(advance),
    collectedSlots: advance.status === 'ready' ? advanceSlots(snapshot, message, cascade) : undefined,
  };
}

function advanceSlots(
  snapshot: FitmentSnapshot,
  message: string,
  cascade: FitmentCascadePort,
): FitmentSnapshot['slots'] {
  return advanceVehicleSlots({
    slots: snapshot.slots,
    message,
    asked: snapshot.missing,
    aliases: cascade.listAliases(),
  }).slots;
}

function verifiedProductFromCascade(advance: FitmentCascadeAdvance) {
  if (advance.status !== 'ready' || advance.result.status !== 'one') {
    return undefined;
  }
  return verifiedProductFromTemplate(advance.result.template);
}

function cascadeFact(advance: FitmentCascadeAdvance): string {
  if (advance.status === 'suspended') {
    const options = advance.snapshot.options?.length
      ? ` Do wyboru: ${advance.snapshot.options.join(', ')}.`
      : '';
    return `Brakuje ${missingSlotLabel(advance.snapshot.missing)}.${options}${knownVehicleFact(advance.snapshot.slots)} Zapytaj tylko o brakujące. Nie wołaj resolve-template.`;
  }
  const result = advance.result;
  if (result.status === 'none') {
    return 'Kaskada: none. Nie ma szablonu dla tego auta. Nie wołaj resolve-template.';
  }
  if (result.status === 'one') {
    const template = result.template;
    return `Kaskada: one. recordKey=${template.recordKey}, brand=${template.brandKey}, model=${template.modelKey}, body=${template.bodyTypeKey ?? ''}. Nie wołaj resolve-template.`;
  }
  const models = [...new Set(result.templates.map((template) => template.modelKey))].sort();
  const bodies = [
    ...new Set(
      result.templates
        .map((template) => template.bodyTypeKey)
        .filter((key): key is string => Boolean(key)),
    ),
  ].sort();
  return `Kaskada: many (${result.templates.length}). Modele: ${models.join(', ')}. Nadwozia: ${bodies.join(', ')}. Nie wołaj resolve-template.`;
}

function turnFromCascade(advance: FitmentCascadeAdvance): PreparedTurn {
  const profile = profileOrOutOfScope('product_info');
  const executionNote = cascadeFact(advance);
  const base = assembleTurnInstructions(profile);
  const suspended = advance.status === 'suspended';
  const entities = suspended ? advance.snapshot.slots : {};
  return {
    intent: 'product_info',
    profile,
    toolIds: suspended ? [] : [...KNOWLEDGE_TOOLS],
    instructions: `${base}\n\n${executionNote}`,
    subIntent: 'fitment',
    mode: 'action',
    entities,
    execution: suspended
      ? { kind: 'workflow', workflow: FITMENT_CASCADE_WORKFLOW }
      : { kind: 'knowledge', tools: [...KNOWLEDGE_TOOLS] },
    fitment: suspended ? advance.snapshot : undefined,
    clearFitment: suspended ? undefined : true,
    cascadeMatch: suspended ? 'many' : advance.result.status,
    verifiedProduct: verifiedProductFromCascade(advance),
    relatedBranches: ['dopasowanie'],
    executionNote,
  };
}
