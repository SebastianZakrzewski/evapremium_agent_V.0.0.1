import {
  advanceContactCollection,
  type ContactSlots,
  type ContactWorkflowSnapshot,
} from '../../domain/collect-contact';
import { chooseExecution, type ExecutionChoice } from '../../domain/choose-execution';
import { FITMENT_CASCADE_WORKFLOW } from '../../domain/fitment-session';
import type { FitmentSnapshot } from '../../domain/fitment-session';
import { fewShotLinesForIntent } from '../../domain/leaf-retrieval-few-shot';
import {
  advanceQuoteVehicle,
  advanceVehicleSlots,
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
import type { IntentProfile } from './intent-profile';
import type { QualifyResult, ShopIntent, ShopToolId } from './schema';
import type { VerifiedProduct } from '../../domain/verified-product';

export type { VerifiedProduct };

export const EVA_TURN_BASE_INSTRUCTIONS =
  'Język: polski. Cena i fakt sklepu tylko z narzędzi Nest. Bez SQL. Bez kwoty spoza quote-price. Bez polityki sklepu, której nie zwrócił hit lookup-leaf. Tekst dla klienta nie ujawnia drzewa kontekstu, liści, slugów, narzędzi ani braku rekordu.';

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
  collectedSlots?: RouterEntities;
  contactWorkflow?: ContactWorkflowSnapshot;
  contactSlots?: ContactSlots;
  relatedBranches: string[];
  executionNote?: string;
};

const MISSING_LABEL: Record<VehicleSlotKey, string> = {
  car_brand: 'marki auta',
  car_model: 'modelu auta',
  year: 'rocznika',
  body_type: 'typu nadwozia',
};

export function missingSlotLabel(key: VehicleSlotKey): string {
  return MISSING_LABEL[key];
}

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

export function knownVehicleFact(slots: RouterEntities): string {
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

function missingVehicleFact(entities: RouterEntities): string | undefined {
  const collected = advanceVehicleSlots({ slots: entities });
  if (collected.missing === undefined) {
    return undefined;
  }
  return `Brakuje ${MISSING_LABEL[collected.missing]}.${knownVehicleFact(collected.slots)} Zapytaj tylko o brakujące. Nie wołaj resolve-template.`;
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

export function assembledTurn(
  profile: IntentProfile,
  result?: QualifyResult,
  message?: string,
): PreparedTurn {
  const entities = advanceVehicleSlots({
    slots: result?.entities ?? {},
    message,
    fillMissingFromMessage: false,
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

export function attachContactCollection(
  turn: PreparedTurn,
  input: {
    message?: string;
    known?: ContactSlots;
    open?: ContactWorkflowSnapshot;
  },
): PreparedTurn {
  if (
    turn.intent !== 'pricing' ||
    turn.subIntent !== 'indicative_quote' ||
    turn.mode !== 'action'
  ) {
    return turn;
  }
  const knownReady = Boolean(input.known?.givenName && input.known.phone);
  const advanced = advanceContactCollection({
    slots: { ...input.known, ...input.open?.slots },
    message: input.message,
    asked: input.open?.missing,
  });
  const slots =
    advanced.status === 'ready' ? advanced.slots : advanced.snapshot.slots;
  if (knownReady && advanced.status === 'ready' && !messageAddsContact(input.message, input.known)) {
    return turn;
  }
  const exposeTool = turn.execution.kind !== 'workflow';
  const toolIds =
    !exposeTool || turn.toolIds.includes('collect-contact')
      ? turn.toolIds
      : [...turn.toolIds, 'collect-contact' as const];
  const note = exposeTool ? contactExecutionNote(advanced) : undefined;
  const executionNote = [turn.executionNote, note].filter(Boolean).join('\n');
  return {
    ...turn,
    toolIds,
    contactSlots: hasContactFact(slots) ? slots : undefined,
    contactWorkflow: advanced.status === 'suspended' ? advanced.snapshot : undefined,
    executionNote: executionNote || undefined,
    instructions: note ? `${turn.instructions}\n\n${note}` : turn.instructions,
  };
}

export function holdContactWorkflow(
  turn: PreparedTurn,
  open: ContactWorkflowSnapshot | undefined,
): PreparedTurn {
  if (open === undefined) {
    return turn;
  }
  if (!turn.toolIds.includes('collect-contact')) {
    return { ...turn, contactWorkflow: open };
  }
  const missing = open.missing === 'given_name' ? 'imienia' : 'numeru telefonu';
  const note = `Zbieranie kontaktu: brakuje ${missing}. E-mail jest opcjonalny. Zapytaj tylko o brakujące i wywołaj collect-contact.`;
  const executionNote = [turn.executionNote, note].filter(Boolean).join('\n');
  return {
    ...turn,
    contactWorkflow: open,
    executionNote,
    instructions: `${turn.instructions}\n\n${note}`,
  };
}

function messageAddsContact(
  message: string | undefined,
  known: ContactSlots | undefined,
): boolean {
  if (message === undefined) {
    return false;
  }
  const read = advanceContactCollection({ slots: known, message });
  const slots = read.status === 'ready' ? read.slots : read.snapshot.slots;
  return (
    slots.givenName !== known?.givenName ||
    slots.phone !== known?.phone ||
    slots.email !== known?.email
  );
}

function hasContactFact(slots: ContactSlots): boolean {
  return Boolean(slots.givenName || slots.phone || slots.email);
}

function contactExecutionNote(advanced: ReturnType<typeof advanceContactCollection>): string {
  if (advanced.status === 'ready') {
    const email = advanced.slots.email ? `, email=${advanced.slots.email}` : '';
    return `Kontakt kompletny: imię=${advanced.slots.givenName}, telefon=${advanced.slots.phone}${email}. Wywołaj collect-contact z tymi polami.`;
  }
  const missing = advanced.missing === 'given_name' ? 'imienia' : 'numeru telefonu';
  return `Zbieranie kontaktu: brakuje ${missing}. E-mail jest opcjonalny. Zapytaj tylko o brakujące i wywołaj collect-contact.`;
}
