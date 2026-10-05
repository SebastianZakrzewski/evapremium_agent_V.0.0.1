import {
  advanceVehicleSlots,
  type VehicleSlotKey,
} from './quote-vehicle';
import type { RouterEntities } from './sub-intent-catalog';
import {
  mapAliases,
  normalizeSlots,
  type MatTemplate,
  type TemplateCascadeInput,
  type TemplateCascadeResult,
  type VehicleSlotAlias,
} from './template-cascade';

export const FITMENT_CASCADE_WORKFLOW = 'fitment_cascade';

export type FitmentSnapshot = {
  workflow: typeof FITMENT_CASCADE_WORKFLOW;
  step: 'waiting_for_vehicle';
  missing: VehicleSlotKey;
  slots: RouterEntities;
  options?: string[];
};

export type FitmentCascadePort = {
  resolve(input: TemplateCascadeInput): Promise<TemplateCascadeResult>;
  listAliases(): VehicleSlotAlias[];
  classifyGeneration?(customerGeneration: string, generationKeys: string[]): Promise<string | null>;
};

export type FitmentCascadeAdvance =
  | { status: 'suspended'; snapshot: FitmentSnapshot }
  | { status: 'ready'; result: TemplateCascadeResult };

export type FitmentMemory = {
  getFitment(sessionId: string): FitmentSnapshot | undefined;
  setFitment(sessionId: string, snapshot: FitmentSnapshot | undefined): void;
};

export async function advanceFitmentCascade(input: {
  slots: RouterEntities;
  message?: string;
  asked?: VehicleSlotKey;
  resolve: FitmentCascadePort['resolve'];
  aliases?: VehicleSlotAlias[];
  classifyGeneration?: FitmentCascadePort['classifyGeneration'];
}): Promise<FitmentCascadeAdvance> {
  const aliases = input.aliases ?? [];
  const collected = advanceVehicleSlots({
    slots: input.slots,
    message: input.message,
    aliases,
    asked: input.message !== undefined ? input.asked : undefined,
  });
  const slots = { ...collected.slots };
  if (!hasVehicleFact(slots)) {
    return waiting('car_brand', slots);
  }

  const result = await input.resolve(cascadeInput(slots));
  if (result.droppedBrand) {
    delete slots.car_brand;
  }
  if (result.droppedModel) {
    delete slots.car_model;
  }
  if (result.bodyTypeKey) {
    slots.body_type = result.bodyTypeKey;
  } else if (unmatchedBody(slots, aliases)) {
    delete slots.body_type;
  }
  const resolvedTemplates = templatesOf(result);
  if (resolvedTemplates.length > 0) {
    fillUniqueCatalogKeys(slots, resolvedTemplates);
  }
  if (!slots.car_brand && !slots.car_model) {
    return waiting('car_brand', slots);
  }
  if (result.status === 'none') {
    const recovered = await recoverEmpty(slots, input.resolve);
    if (recovered) {
      return recovered;
    }
    return { status: 'ready', result };
  }
  if (result.status === 'one') {
    return { status: 'ready', result };
  }

  const narrowed = await classifyGenerationAnswer(
    narrowByGeneration(result.templates, slots.generation),
    result.templates,
    slots,
    input.classifyGeneration,
  );
  if (narrowed.kind === 'ask') {
    return waiting('generation', clearSlot(slots, 'generation'), narrowed.options);
  }
  if (narrowed.kind === 'one') {
    return { status: 'ready', result: { status: 'one', template: narrowed.template } };
  }

  const question = nextQuestion(narrowed.templates, slots);
  if (!question) {
    return {
      status: 'ready',
      result: { status: 'many', templates: narrowed.templates },
    };
  }
  return waiting(question.missing, slots, question.options);
}

function hasVehicleFact(slots: RouterEntities): boolean {
  return (
    Boolean(slots.car_brand) ||
    Boolean(slots.car_model) ||
    typeof slots.year === 'number' ||
    Boolean(slots.body_type) ||
    Boolean(slots.generation)
  );
}

function fillUniqueCatalogKeys(slots: RouterEntities, templates: MatTemplate[]): void {
  const brands = unique(templates.map((template) => template.brandKey));
  const models = unique(templates.map((template) => template.modelKey));
  if (!slots.car_brand && brands.length === 1) {
    slots.car_brand = brands[0];
  }
  if (!slots.car_model && models.length === 1) {
    slots.car_model = models[0];
  }
}

function cascadeInput(slots: RouterEntities): TemplateCascadeInput {
  return {
    brand: slots.car_brand,
    model: slots.car_model,
    year: slots.year,
    bodyType: slots.body_type,
  };
}

function unmatchedBody(slots: RouterEntities, aliases: VehicleSlotAlias[]): boolean {
  if (!slots.body_type || aliases.length === 0) {
    return false;
  }
  return !mapAliases(normalizeSlots({ bodyType: slots.body_type }), aliases).bodyTypeKey;
}

async function classifyGenerationAnswer(
  narrowed: GenerationNarrowing,
  templates: MatTemplate[],
  slots: RouterEntities,
  classifyGeneration: FitmentCascadePort['classifyGeneration'],
): Promise<GenerationNarrowing> {
  if (narrowed.kind !== 'ask' || !slots.generation || !classifyGeneration) {
    return narrowed;
  }
  const chosen = await classifyGeneration(slots.generation, narrowed.options);
  if (!chosen || !narrowed.options.includes(chosen)) {
    return narrowed;
  }
  slots.generation = chosen;
  return narrowByGeneration(templates, chosen);
}

async function recoverEmpty(
  slots: RouterEntities,
  resolve: FitmentCascadePort['resolve'],
): Promise<FitmentCascadeAdvance | undefined> {
  if (slots.body_type) {
    const withoutBody = await resolve(cascadeInput(clearSlot(slots, 'body_type')));
    if (withoutBody.status !== 'none') {
      return waiting(
        'body_type',
        clearSlot(slots, 'body_type'),
        bodyOptions(templatesOf(withoutBody)),
      );
    }
  }
  if (typeof slots.year === 'number') {
    const withoutYear = await resolve(cascadeInput(clearSlot(slots, 'year')));
    if (withoutYear.status !== 'none') {
      return waiting('year', clearSlot(slots, 'year'), yearOptions(templatesOf(withoutYear)));
    }
    const withoutBoth = await resolve(
      cascadeInput(clearSlot(clearSlot(slots, 'year'), 'body_type')),
    );
    if (withoutBoth.status !== 'none') {
      return waiting(
        'year',
        clearSlot(clearSlot(slots, 'year'), 'body_type'),
        yearOptions(templatesOf(withoutBoth)),
      );
    }
  }
  return undefined;
}

function nextQuestion(
  templates: MatTemplate[],
  slots: RouterEntities,
): { missing: VehicleSlotKey; options: string[] } | undefined {
  const brands = unique(templates.map((template) => template.brandKey));
  const models = unique(templates.map((template) => template.modelKey));
  const bodies = bodyOptions(templates);
  const years = yearOptions(templates);
  const generations = generationOptions(templates);
  if (!slots.car_brand && brands.length > 1) {
    return { missing: 'car_brand', options: brands };
  }
  if (!slots.car_model && models.length > 1) {
    return { missing: 'car_model', options: models };
  }
  if (slots.year === undefined && years.length > 1) {
    return { missing: 'year', options: years };
  }
  if (typeof slots.year === 'number' && generations.length > 1 && !slots.generation) {
    return { missing: 'generation', options: generations };
  }
  if (!slots.body_type && bodies.length > 1) {
    return { missing: 'body_type', options: bodies };
  }
  return undefined;
}

function templatesOf(result: TemplateCascadeResult): MatTemplate[] {
  if (result.status === 'one') {
    return [result.template];
  }
  if (result.status === 'many') {
    return result.templates;
  }
  return [];
}

function bodyOptions(templates: MatTemplate[]): string[] {
  return unique(
    templates
      .map((template) => template.bodyTypeKey)
      .filter((key): key is string => Boolean(key)),
  );
}

function yearOptions(templates: MatTemplate[]): string[] {
  return unique(templates.map(yearLabel));
}

type GenerationNarrowing =
  | { kind: 'many'; templates: MatTemplate[] }
  | { kind: 'one'; template: MatTemplate }
  | { kind: 'ask'; options: string[] };

function narrowByGeneration(
  templates: MatTemplate[],
  generation: string | undefined,
): GenerationNarrowing {
  if (!generation?.trim()) {
    return { kind: 'many', templates };
  }
  const matched = templates.filter((template) =>
    matchesGeneration(template, generation),
  );
  const first = matched[0];
  if (!first) {
    return { kind: 'ask', options: generationOptions(templates) };
  }
  if (matched.length === 1) {
    return { kind: 'one', template: first };
  }
  return { kind: 'many', templates: matched };
}

const GENERATION_WORDS: Record<string, string> = {
  pierwsza: '1',
  pierwszy: '1',
  druga: '2',
  drugi: '2',
  ii: '2',
  trzecia: '3',
  trzeci: '3',
  iii: '3',
  czwarta: '4',
  czwarty: '4',
  piata: '5',
  piaty: '5',
  szosta: '6',
  szosty: '6',
  siodma: '7',
  siodmy: '7',
  osma: '8',
  osmy: '8',
  dziewiata: '9',
  dziewiaty: '9',
};

function foldGeneration(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function generationNumber(value: string): string | undefined {
  const folded = foldGeneration(value);
  const marked = folded.match(/(\d+)\s*gen\b/u);
  if (marked?.[1]) {
    return marked[1];
  }
  for (const token of folded.split(' ')) {
    const word = GENERATION_WORDS[token];
    if (word) {
      return word;
    }
  }
  if (/^\d+$/u.test(folded)) {
    return folded;
  }
  return undefined;
}

function generationLabel(template: MatTemplate): string {
  const marked = template.modelKey.match(/(\d+)\s*gen\b/iu);
  if (marked?.[1]) {
    return `${marked[1]} gen`;
  }
  const column = template.generation?.trim();
  if (column) {
    return column;
  }
  return template.modelKey.trim();
}

function generationOptions(templates: MatTemplate[]): string[] {
  return unique(templates.map(generationLabel));
}

function matchesGeneration(template: MatTemplate, answer: string): boolean {
  const label = generationLabel(template);
  if (foldGeneration(label) === foldGeneration(answer)) {
    return true;
  }
  const answerNumber = generationNumber(answer);
  const labelNumber = generationNumber(label);
  return answerNumber !== undefined && answerNumber === labelNumber;
}

function yearLabel(template: MatTemplate): string {
  const from = template.yearFrom ?? '?';
  if (template.isOpenEnded || template.yearTo === null) {
    return `${from}+`;
  }
  return `${from}-${template.yearTo}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function clearSlot(slots: RouterEntities, key: VehicleSlotKey): RouterEntities {
  const next: RouterEntities = { ...slots };
  delete next[key];
  return next;
}

function waiting(
  missing: VehicleSlotKey,
  slots: RouterEntities,
  options?: string[],
): FitmentCascadeAdvance {
  return {
    status: 'suspended',
    snapshot: {
      workflow: FITMENT_CASCADE_WORKFLOW,
      step: 'waiting_for_vehicle',
      missing,
      slots,
      options: options && options.length > 0 ? options : undefined,
    },
  };
}
