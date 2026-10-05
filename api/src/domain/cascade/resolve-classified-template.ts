import { mapAliases, normalizeSlots } from './alias-map';
import { activeBrandKeys, shortlistModelKeys } from './model-shortlist';
import { filterTemplates, toResult } from './template-match';
import {
  MODEL_KEY_SHORTLIST_LIMIT,
  type MatTemplate,
  type NormalizedSlots,
  type TemplateCascadeInput,
  type TemplateCascadeResult,
  type VehicleKeyClassifier,
  type VehicleSlotAlias,
} from './types';

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

type DroppedKeys = { droppedBrand?: true; droppedModel?: true };

async function classifyBrandKey(
  slots: NormalizedSlots,
  aliasedBrandKey: string | undefined,
  templates: MatTemplate[],
  classifier: VehicleKeyClassifier,
  dropped: DroppedKeys,
): Promise<string | undefined | 'reject'> {
  if (!slots.brand || aliasedBrandKey) {
    return aliasedBrandKey;
  }
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
    return 'reject';
  }
  if (!resolvedBrand) {
    dropped.droppedBrand = true;
  }
  return resolvedBrand;
}

async function classifyModelKeys(
  slots: NormalizedSlots,
  aliasedModelKey: string | undefined,
  brandKey: string | undefined,
  templates: MatTemplate[],
  classifier: VehicleKeyClassifier,
  dropped: DroppedKeys,
): Promise<{
  modelKeys?: string[];
  modelCandidates: string[];
  modelFromAlias: boolean;
}> {
  if (aliasedModelKey) {
    return {
      modelKeys: [aliasedModelKey],
      modelCandidates: [],
      modelFromAlias: true,
    };
  }
  if (!slots.model) {
    return { modelCandidates: [], modelFromAlias: false };
  }
  const modelCandidates = brandKey
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
    return { modelCandidates, modelFromAlias: false };
  }
  const chosen = keysOnList(
    await classifier.classifyModel({
      customerModel: slots.model,
      modelKeys: modelCandidates,
      year: slots.year,
    }),
    modelCandidates,
  );
  if (chosen.length === 0) {
    dropped.droppedModel = true;
    return { modelCandidates, modelFromAlias: false };
  }
  return { modelKeys: chosen, modelCandidates, modelFromAlias: false };
}

/**
 * Alias, a gdy go brak — klasyfikator marki, modelu i nadwozia.
 * Wybór spoza listy kluczy katalogu kończy się `none`, bez zgadywania.
 */
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

  const brand = await classifyBrandKey(
    slots,
    aliased.brandKey,
    templates,
    classifier,
    dropped,
  );
  if (brand === 'reject') {
    return { status: 'none' };
  }
  const brandKey = brand;

  const models = await classifyModelKeys(
    slots,
    aliased.modelKey,
    brandKey,
    templates,
    classifier,
    dropped,
  );
  const { modelKeys, modelCandidates, modelFromAlias } = models;

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

