import { mapAliases, normalizeSlots } from './alias-map';
import type {
  MappedKeys,
  MatTemplate,
  NormalizedSlots,
  SlotMismatch,
  TemplateCascadeInput,
  TemplateCascadeResult,
  VehicleSlotAlias,
} from './types';

function matchesBodyType(template: MatTemplate, bodyTypeKey: string): boolean {
  return (
    template.bodyTypeKey === bodyTypeKey ||
    template.bodyType1Key === bodyTypeKey ||
    template.bodyType2Key === bodyTypeKey ||
    template.bodyType3Key === bodyTypeKey
  );
}

export function matchesYear(template: MatTemplate, year: number): boolean {
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

export function filterTemplates(
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

export function toResult(
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

/**
 * Rok i nadwozie, które odpadają ze szablonów już wskazanego wariantu.
 * Pusty `identified` nie jest tu brakiem roku — to brak samego wariantu.
 */
export function constraintMismatches(
  slots: NormalizedSlots,
  identified: MatTemplate[],
  bodyTypeKey?: string,
): SlotMismatch[] {
  if (identified.length === 0) {
    return [];
  }
  const mismatches: SlotMismatch[] = [];
  const yearMiss =
    slots.year !== undefined &&
    !identified.some((template) => matchesYear(template, slots.year as number));
  if (yearMiss && slots.year !== undefined) {
    mismatches.push({ slot: 'year', value: String(slots.year) });
  }
  if (!slots.bodyType) {
    return mismatches;
  }
  const bodyPool = yearMiss
    ? identified
    : identified.filter(
        (template) =>
          slots.year === undefined || matchesYear(template, slots.year),
      );
  const bodyFits = Boolean(
    bodyTypeKey && bodyPool.some((template) => matchesBodyType(template, bodyTypeKey)),
  );
  if (!bodyFits) {
    mismatches.push({ slot: 'body_type', value: slots.bodyType });
  }
  return mismatches;
}

/** Jednoznaczne klucze z aliasów. Fakt spoza katalogu zwraca `none` z listą braków. */
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

  const identified = filterTemplates(
    templates,
    { brandKey: keys.brandKey, modelKey: keys.modelKey },
    slots.recordKey,
  );
  if (slots.bodyType && !keys.bodyTypeKey) {
    const mismatches = constraintMismatches(slots, identified, undefined);
    if (!mismatches.some((mismatch) => mismatch.slot === 'body_type')) {
      mismatches.push({ slot: 'body_type', value: slots.bodyType });
    }
    return { status: 'none', mismatches };
  }
  const matched = filterTemplates(templates, keys, slots.recordKey, slots.year);
  if (matched.length === 0) {
    const mismatches = constraintMismatches(slots, identified, keys.bodyTypeKey);
    if (mismatches.length > 0) {
      return { status: 'none', mismatches };
    }
  }
  return toResult(matched);
}
