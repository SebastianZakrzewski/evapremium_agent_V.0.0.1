import { mapAliases, normalizeSlots } from './alias-map';
import type {
  MappedKeys,
  MatTemplate,
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

/** Jednoznaczne klucze z aliasów. Bez dopasowania i bez recordKey zwraca `none`. */
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
