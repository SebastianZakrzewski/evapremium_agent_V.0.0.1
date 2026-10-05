export type TemplateCascadeInput = {
  brand?: string;
  model?: string;
  bodyType?: string;
  year?: number;
  recordKey?: string;
};

export type NormalizedSlots = {
  brand?: string;
  model?: string;
  bodyType?: string;
  year?: number;
  recordKey?: string;
};

export type SlotKind = 'brand' | 'model' | 'body_type';

export type VehicleSlotAlias = {
  slotKind: SlotKind;
  aliasNormalized: string;
  canonicalKey: string;
  brandKey: string | null;
};

export type MappedKeys = {
  brandKey?: string;
  modelKey?: string;
  modelKeys?: string[];
  bodyTypeKey?: string;
};

export const MODEL_KEY_SHORTLIST_LIMIT = 12;

export type BrandClassificationInput = {
  customerBrand: string;
  brandKeys: string[];
};

export type ModelClassificationInput = {
  customerModel: string;
  modelKeys: string[];
  year?: number;
};

export type BodyClassificationInput = {
  customerBody: string;
  bodyKeys: string[];
};

export type GenerationClassificationInput = {
  customerGeneration: string;
  generationKeys: string[];
};

export type VehicleKeyClassifier = {
  classifyBrand(input: BrandClassificationInput): Promise<string | null>;
  classifyModel(input: ModelClassificationInput): Promise<string[]>;
  classifyBody?(input: BodyClassificationInput): Promise<string | null>;
  classifyGeneration?(input: GenerationClassificationInput): Promise<string | null>;
};

export type MatTemplate = {
  id: string;
  recordKey: string;
  brandKey: string;
  modelKey: string;
  dealerPricingCategoryKey: string;
  isActive: boolean;
  yearFrom: number | null;
  yearTo: number | null;
  isOpenEnded: boolean;
  bodyTypeKey: string | null;
  bodyType1Key: string | null;
  bodyType2Key: string | null;
  bodyType3Key: string | null;
  /** Shop card column. Absent on fixtures that do not load the catalog row. */
  modelFamilyKey?: string;
  /** Shop card column. Absent on fixtures that do not load the catalog row. */
  generation?: string;
};

export type TemplateCascadeResult =
  | { status: 'none'; bodyTypeKey?: string; droppedBrand?: true; droppedModel?: true }
  | { status: 'one'; template: MatTemplate; bodyTypeKey?: string; droppedBrand?: true; droppedModel?: true }
  | { status: 'many'; templates: MatTemplate[]; bodyTypeKey?: string; droppedBrand?: true; droppedModel?: true };

function collapseWhitespace(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeSlots(input: TemplateCascadeInput): NormalizedSlots {
  return {
    brand: input.brand ? collapseWhitespace(input.brand) : undefined,
    model: input.model ? collapseWhitespace(input.model) : undefined,
    bodyType: input.bodyType ? collapseWhitespace(input.bodyType) : undefined,
    year: input.year,
    recordKey: input.recordKey,
  };
}

function findAlias(
  aliases: VehicleSlotAlias[],
  slotKind: SlotKind,
  aliasNormalized: string,
  brandKey?: string,
): VehicleSlotAlias | undefined {
  const scoped = aliases.find(
    (row) =>
      row.slotKind === slotKind &&
      row.aliasNormalized === aliasNormalized &&
      (brandKey === undefined ||
        row.brandKey === null ||
        row.brandKey === brandKey),
  );
  return scoped;
}

export function mapAliases(
  slots: NormalizedSlots,
  aliases: VehicleSlotAlias[],
): MappedKeys {
  const mapped: MappedKeys = {};

  if (slots.brand) {
    const brand = findAlias(aliases, 'brand', slots.brand);
    if (brand) {
      mapped.brandKey = brand.canonicalKey;
    }
  }

  if (slots.model) {
    const model = findAlias(aliases, 'model', slots.model, mapped.brandKey);
    if (model) {
      mapped.modelKey = model.canonicalKey;
    }
  }

  if (slots.bodyType) {
    const body = findAlias(aliases, 'body_type', slots.bodyType);
    if (body) {
      mapped.bodyTypeKey = body.canonicalKey;
    }
  }

  return mapped;
}

function matchesBodyType(template: MatTemplate, bodyTypeKey: string): boolean {
  return (
    template.bodyTypeKey === bodyTypeKey ||
    template.bodyType1Key === bodyTypeKey ||
    template.bodyType2Key === bodyTypeKey ||
    template.bodyType3Key === bodyTypeKey
  );
}

function matchesYear(template: MatTemplate, year: number): boolean {
  if (template.yearFrom !== null && year < template.yearFrom) {
    return false;
  }
  if (template.isOpenEnded) {
    return true;
  }
  if (template.yearTo === null) {
    return false;
  }
  return year <= template.yearTo;
}

function filterTemplates(
  templates: MatTemplate[],
  keys: MappedKeys,
  recordKey?: string,
  year?: number,
): MatTemplate[] {
  return templates.filter((template) => {
    if (!template.isActive) {
      return false;
    }
    if (recordKey && template.recordKey !== recordKey) {
      return false;
    }
    if (keys.brandKey && template.brandKey !== keys.brandKey) {
      return false;
    }
    if (keys.modelKeys) {
      if (!keys.modelKeys.includes(template.modelKey)) {
        return false;
      }
    } else if (keys.modelKey && template.modelKey !== keys.modelKey) {
      return false;
    }
    if (keys.bodyTypeKey && !matchesBodyType(template, keys.bodyTypeKey)) {
      return false;
    }
    if (year !== undefined && !matchesYear(template, year)) {
      return false;
    }
    return true;
  });
}

function normalizedIdentityPart(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function vehicleIdentity(template: MatTemplate): string {
  return [
    normalizedIdentityPart(template.brandKey),
    normalizedIdentityPart(template.modelKey),
    template.dealerPricingCategoryKey,
    template.yearFrom ?? '',
    template.yearTo ?? '',
    template.isOpenEnded ? '1' : '0',
    template.bodyTypeKey ?? '',
    template.bodyType1Key ?? '',
    template.bodyType2Key ?? '',
    template.bodyType3Key ?? '',
  ].join('\0');
}

function collapseDuplicateTemplates(matches: MatTemplate[]): MatTemplate[] {
  const byIdentity = new Map<string, MatTemplate>();
  for (const template of matches) {
    const identity = vehicleIdentity(template);
    const current = byIdentity.get(identity);
    if (!current || template.recordKey < current.recordKey) {
      byIdentity.set(identity, template);
    }
  }
  return [...byIdentity.values()];
}

function toResult(
  matches: MatTemplate[],
  bodyTypeKey?: string,
  dropped?: { droppedBrand?: true; droppedModel?: true },
): TemplateCascadeResult {
  const unique = collapseDuplicateTemplates(matches);
  const first = unique[0];
  const classified = {
    ...(bodyTypeKey ? { bodyTypeKey } : {}),
    ...(dropped?.droppedBrand ? { droppedBrand: true as const } : {}),
    ...(dropped?.droppedModel ? { droppedModel: true as const } : {}),
  };
  if (!first) {
    return { status: 'none', ...classified };
  }
  if (unique.length === 1) {
    return { status: 'one', template: first, ...classified };
  }
  return { status: 'many', templates: unique, ...classified };
}

export function resolveTemplate(
  input: TemplateCascadeInput,
  templates: MatTemplate[],
  aliases: VehicleSlotAlias[],
): TemplateCascadeResult {
  const slots = normalizeSlots(input);
  const keys = mapAliases(slots, aliases);
  const hasMappedKey = Boolean(
    keys.brandKey || keys.modelKey || keys.bodyTypeKey,
  );

  if (!hasMappedKey && !slots.recordKey) {
    return { status: 'none' };
  }

  return toResult(
    filterTemplates(templates, keys, slots.recordKey, slots.year),
  );
}

export function activeBrandKeys(templates: MatTemplate[]): string[] {
  return [
    ...new Set(
      templates
        .filter((template) => template.isActive)
        .map((template) => template.brandKey),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function shortlistModelKeys(
  templates: MatTemplate[],
  brandKey: string,
  customerModel: string,
  limit = MODEL_KEY_SHORTLIST_LIMIT,
  year?: number,
): string[] {
  const models = [
    ...new Set(
      templates
        .filter((template) => template.isActive && template.brandKey === brandKey)
        .map((template) => template.modelKey),
    ),
  ];
  const scoreFor = (key: string) => {
    const text = modelSimilarity(key, customerModel);
    const inYear =
      year !== undefined &&
      templates.some(
        (template) =>
          template.isActive &&
          template.brandKey === brandKey &&
          template.modelKey === key &&
          matchesYear(template, year),
      );
    return text + (inYear ? 3_000 : 0);
  };
  return models
    .sort((left, right) => {
      const score = scoreFor(right) - scoreFor(left);
      if (score !== 0) {
        return score;
      }
      return left.localeCompare(right);
    })
    .slice(0, limit);
}

const GENERATION_FORMS: Readonly<Record<string, readonly string[]>> = {
  '1': ['1', 'mk1'],
  '2': ['2', 'ii', 'mk2'],
  '3': ['3', 'iii', 'mk3'],
  '4': ['4', 'iv', 'mk4'],
  '5': ['5', 'mk5'],
  '6': ['6', 'vi', 'mk6'],
  '7': ['7', 'vii', 'mk7', 'siodemka', 'siódemka'],
  '8': ['8', 'viii', 'mk8', 'osemka', 'ósemka'],
  '9': ['9', 'ix', 'mk9'],
};

function compactKey(value: string): string {
  return collapseWhitespace(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

function generationDigits(value: string): Set<string> {
  const tokens = new Set(collapseWhitespace(value).split(' ').filter((token) => token.length > 0));
  const compact = compactKey(value);
  const found = new Set<string>();
  for (const [digit, forms] of Object.entries(GENERATION_FORMS)) {
    for (const form of forms) {
      const needle = compactKey(form);
      if (needle.length === 0) {
        continue;
      }
      const tokenHit = tokens.has(form) || tokens.has(needle);
      const compactHit =
        (form.startsWith('mk') || needle.length >= 5) && compact.includes(needle);
      const digitHit =
        needle.length === 1 && new RegExp(`(?:^|\\D)${needle}(?:\\D|$)`).test(compact);
      if (tokenHit || compactHit || digitHit) {
        found.add(digit);
      }
    }
  }
  return found;
}

function generationScore(candidate: string, query: string): number {
  const left = generationDigits(candidate);
  const right = generationDigits(query);
  if (right.size === 0) {
    return 0;
  }
  for (const digit of right) {
    if (left.has(digit)) {
      return 8_000;
    }
  }
  return left.size > 0 ? -3_000 : 0;
}

function modelSimilarity(candidate: string, query: string): number {
  const left = collapseWhitespace(candidate);
  const right = collapseWhitespace(query);
  if (left === right) {
    return 1_000_000;
  }
  const leftCompact = compactKey(candidate);
  const rightCompact = compactKey(query);
  let score = 0;
  if (left.includes(right) || right.includes(left)) {
    score += 5_000;
  }
  if (
    rightCompact.length > 0 &&
    (leftCompact.includes(rightCompact) || rightCompact.includes(leftCompact))
  ) {
    score += 4_000;
  }
  for (const token of right.split(' ')) {
    if (token.length > 0 && (left.includes(token) || leftCompact.includes(token))) {
      score += 1_000;
    }
  }
  const distance = levenshtein(leftCompact, rightCompact);
  const span = Math.max(leftCompact.length, rightCompact.length, 1);
  score += Math.round((1 - distance / span) * 500);
  score += generationScore(candidate, query);
  return score;
}

function levenshtein(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function catalogKeyForChoice(chosen: string, allowed: string[]): string | undefined {
  if (allowed.includes(chosen)) {
    return chosen;
  }
  const trimmed = chosen.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const matches = allowed.filter((key) => key.trim() === trimmed);
  return matches.length === 1 ? matches[0] : undefined;
}

function keysOnList(chosen: string[], allowed: string[]): string[] {
  const resolved: string[] = [];
  for (const key of chosen) {
    const catalogKey = catalogKeyForChoice(key, allowed);
    if (catalogKey && !resolved.includes(catalogKey)) {
      resolved.push(catalogKey);
    }
  }
  return resolved;
}

export async function resolveClassifiedTemplate(
  input: TemplateCascadeInput,
  templates: MatTemplate[],
  aliases: VehicleSlotAlias[],
  classifier: VehicleKeyClassifier,
): Promise<TemplateCascadeResult> {
  const slots = normalizeSlots(input);
  const aliased = mapAliases(slots, aliases);
  let bodyTypeKey = aliased.bodyTypeKey;
  const dropped: { droppedBrand?: true; droppedModel?: true } = {};

  let brandKey = aliased.brandKey;
  if (slots.brand && !brandKey) {
    const brandKeys = activeBrandKeys(templates);
    const chosenBrand =
      brandKeys.length === 0
        ? null
        : await classifier.classifyBrand({
            customerBrand: slots.brand,
            brandKeys,
          });
    const resolvedBrand = chosenBrand
      ? catalogKeyForChoice(chosenBrand, brandKeys)
      : undefined;
    if (chosenBrand && !resolvedBrand) {
      return { status: 'none' };
    }
    brandKey = resolvedBrand;
    if (!brandKey) {
      dropped.droppedBrand = true;
    }
  }

  const modelFromAlias = Boolean(aliased.modelKey);
  let modelKeys: string[] | undefined;
  let modelCandidates: string[] = [];
  if (aliased.modelKey) {
    modelKeys = [aliased.modelKey];
  } else if (slots.model) {
    modelCandidates = brandKey
      ? shortlistModelKeys(
          templates,
          brandKey,
          slots.model,
          MODEL_KEY_SHORTLIST_LIMIT,
          slots.year,
        )
      : shortlistModelKeysAnyBrand(
          templates,
          slots.model,
          MODEL_KEY_SHORTLIST_LIMIT,
          slots.year,
        );
    if (modelCandidates.length === 0) {
      dropped.droppedModel = true;
    } else {
      modelKeys = keysOnList(
        await classifier.classifyModel({
          customerModel: slots.model,
          modelKeys: modelCandidates,
          year: slots.year,
        }),
        modelCandidates,
      );
      if (modelKeys.length === 0) {
        dropped.droppedModel = true;
        modelKeys = undefined;
      }
    }
  }

  if (!brandKey && !modelKeys && !slots.recordKey && !bodyTypeKey) {
    return toResult([], undefined, dropped);
  }

  const candidates = filterTemplates(
    templates,
    { brandKey, modelKeys },
    slots.recordKey,
    slots.year,
  );
  if (slots.bodyType && !aliased.bodyTypeKey) {
    bodyTypeKey = await resolveBodyTypeKey(
      slots.bodyType,
      undefined,
      candidates.length > 0 ? candidates : templates.filter((template) => template.isActive),
      classifier,
    );
  }
  let matches = filterTemplates(
    candidates,
    { bodyTypeKey },
    slots.recordKey,
    slots.year,
  );
  if (
    matches.length === 0 &&
    !modelFromAlias &&
    modelCandidates.length > (modelKeys?.length ?? 0) &&
    brandKey
  ) {
    matches = filterTemplates(
      templates,
      { brandKey, modelKeys: modelCandidates, bodyTypeKey },
      slots.recordKey,
      slots.year,
    );
  }
  return toResult(
    matches,
    slots.bodyType && !aliased.bodyTypeKey ? bodyTypeKey : undefined,
    dropped,
  );
}

function shortlistModelKeysAnyBrand(
  templates: MatTemplate[],
  customerModel: string,
  limit: number,
  year?: number,
): string[] {
  const merged: string[] = [];
  for (const brandKey of activeBrandKeys(templates)) {
    for (const key of shortlistModelKeys(templates, brandKey, customerModel, limit, year)) {
      if (!merged.includes(key)) {
        merged.push(key);
      }
    }
  }
  return merged.slice(0, limit);
}

async function resolveBodyTypeKey(
  customerBody: string | undefined,
  aliasKey: string | undefined,
  templates: MatTemplate[],
  classifier: VehicleKeyClassifier,
): Promise<string | undefined> {
  if (!customerBody) {
    return undefined;
  }
  if (aliasKey) {
    return aliasKey;
  }
  if (!classifier.classifyBody) {
    return undefined;
  }
  const bodyKeys = uniqueBodyKeys(templates);
  if (bodyKeys.length === 0) {
    return undefined;
  }
  const chosen = await classifier.classifyBody({
    customerBody,
    bodyKeys,
  });
  return chosen ? catalogKeyForChoice(chosen, bodyKeys) : undefined;
}

function uniqueBodyKeys(templates: MatTemplate[]): string[] {
  const keys = new Set<string>();
  for (const template of templates) {
    for (const key of [
      template.bodyTypeKey,
      template.bodyType1Key,
      template.bodyType2Key,
      template.bodyType3Key,
    ]) {
      if (key) {
        keys.add(key);
      }
    }
  }
  return [...keys];
}
