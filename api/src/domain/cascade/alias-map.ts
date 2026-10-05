import type {
  MappedKeys,
  NormalizedSlots,
  SlotKind,
  TemplateCascadeInput,
  VehicleSlotAlias,
} from './types';

export function collapseWhitespace(value: string): string {
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
