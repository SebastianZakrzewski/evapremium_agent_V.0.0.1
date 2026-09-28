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
  fitment?: FitmentSnapshot;
  clearFitment?: boolean;
  cascadeMatch?: 'none' | 'one' | 'many';
  verifiedProduct?: VerifiedProduct;
  collectedSlots?: RouterEntities;
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
