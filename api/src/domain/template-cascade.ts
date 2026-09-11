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
  bodyTypeKey?: string;
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
};

export type TemplateCascadeResult =
  | { status: 'none' }
  | { status: 'one'; template: MatTemplate }
  | { status: 'many'; templates: MatTemplate[] };

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
    if (keys.modelKey && template.modelKey !== keys.modelKey) {
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

function toResult(matches: MatTemplate[]): TemplateCascadeResult {
  const first = matches[0];
  if (!first) {
    return { status: 'none' };
  }
  if (matches.length === 1) {
    return { status: 'one', template: first };
  }
  return { status: 'many', templates: matches };
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
