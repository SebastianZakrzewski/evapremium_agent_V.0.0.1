import {
  advanceFitmentCascade,
  FITMENT_CASCADE_WORKFLOW,
  type FitmentCascadeAdvance,
  type FitmentCascadePort,
  type FitmentSnapshot,
} from '../../domain/fitment-session';
import {
  advanceContactCollection,
  type ContactWorkflowSnapshot,
} from '../../domain/collect-contact';
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
  holdContactWorkflow,
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
      turn: holdContactWorkflow(
        await resumeFitmentTurn(context.fitment, message, cascade),
        context.contactWorkflow,
      ),
      candidateIntent: 'product_info',
      keepOpenWorkflow: true,
    };
  }
  if (context.quoteWorkflow !== undefined) {
    return {
      turn: holdContactWorkflow(
        resumeQuoteTurn(context.quoteWorkflow, message),
        context.contactWorkflow,
      ),
      candidateIntent: 'pricing',
      keepOpenWorkflow: false,
    };
  }
  if (context.contactWorkflow !== undefined) {
    return {
      turn: resumeContactTurn(context.contactWorkflow, message),
      candidateIntent: 'pricing',
      keepOpenWorkflow: false,
    };
  }
  return undefined;
}

function resumeContactTurn(
  snapshot: ContactWorkflowSnapshot,
  message: string,
): PreparedTurn {
  const advanced = advanceContactCollection({
    slots: snapshot.slots,
    message,
    asked: snapshot.missing,
  });
  const profile = profileOrOutOfScope('pricing');
  const slots = advanced.status === 'ready' ? advanced.slots : advanced.snapshot.slots;
  const missing =
    advanced.status === 'suspended'
      ? advanced.missing === 'given_name'
        ? 'imienia'
        : 'numeru telefonu'
      : undefined;
  const email = slots.email ? `, email=${slots.email}` : '';
  const executionNote =
    advanced.status === 'ready'
      ? `Kontakt kompletny: imię=${slots.givenName}, telefon=${slots.phone}${email}. Wywołaj collect-contact z tymi polami.`
      : `Zbieranie kontaktu: brakuje ${missing}. E-mail jest opcjonalny. Zapytaj tylko o brakujące i wywołaj collect-contact.`;
  const base = assembleTurnInstructions(profile);
  return {
    intent: 'pricing',
    profile,
    toolIds: ['collect-contact'],
    instructions: `${base}\n\n${executionNote}`,
    subIntent: 'indicative_quote',
    mode: 'action',
    entities: {},
    execution: {
      kind: 'tool',
      tool: 'collect-contact',
      tools: ['collect-contact'],
    },
    contactWorkflow: advanced.status === 'suspended' ? advanced.snapshot : undefined,
    contactSlots: slots.givenName || slots.phone || slots.email ? slots : undefined,
    relatedBranches: [],
    executionNote,
  };
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
