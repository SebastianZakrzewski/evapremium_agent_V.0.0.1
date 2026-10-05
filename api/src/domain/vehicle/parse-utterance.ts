import { levenshtein } from '../levenshtein';
import type { RouterEntities } from '../sub-intent-catalog';
import type { VehicleSlotAlias } from '../template-cascade';
import type { VehicleSlotKey } from './types';

const BODY_ALIASES = ['hatchback', 'hatch', 'kombi', 'wagon', 'sedan', 'limuzyna', 'liftback', 'suv', 'coupe', 'cabrio', 'van'] as const;

const OFFER_WORDS = new Set([
  'dywaniki',
  'dywanik',
  'dywanikow',
  'do',
  'na',
  'czy',
  'macie',
  'dla',
  'pod',
]);

const GENERATION_REPLY =
  /\b(\d+\s*gen(?:eracj\w*)?|pierwsz\w+|drug\w+|trzeci\w+|trzecia|czwart\w+|piat\w+|piąt\w+|szost\w+|szóst\w+|siodm\w+|siódm\w+|osm\w+|ósm\w+|dziewiat\w+|dziewiąt\w+)\b/iu;

export function readYear(text: string): number | undefined {
  const match = text.match(/\b(19[89]\d|20[0-3]\d)\b/);
  if (!match?.[1]) {
    return undefined;
  }
  return Number(match[1]);
}

export function readBodyType(
  text: string,
  aliases?: VehicleSlotAlias[],
): string | undefined {
  return matchBodyType(text, aliases)?.alias;
}

export function readVehicleReply(
  message: string,
  aliases?: VehicleSlotAlias[],
): { year?: number; body?: string; rest: string } {
  const year = readYear(message);
  const body = matchBodyType(message, aliases);
  let rest = message;
  if (body) {
    rest = rest.replace(
      new RegExp(`\\b${escapeRegExp(body.token)}\\b`, 'iu'),
      ' ',
    );
  }
  if (year !== undefined) {
    rest = rest.replace(new RegExp(`\\b${year}\\b`, 'u'), ' ');
  }
  rest = rest.replace(/\b(rok|rocznik)\b/giu, ' ');
  return {
    year,
    body: body?.alias,
    rest: rest.replace(/\s+/g, ' ').trim(),
  };
}

function bodyForms(
  aliases: VehicleSlotAlias[] | undefined,
): { alias: string; label: string }[] {
  const forms: { alias: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const row of aliases ?? []) {
    if (row.slotKind !== 'body_type') {
      continue;
    }
    const label = row.aliasNormalized.trim().toLowerCase();
    if (label.length === 0 || seen.has(label)) {
      continue;
    }
    seen.add(label);
    forms.push({ alias: label, label });
  }
  for (const alias of BODY_ALIASES) {
    if (seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    forms.push({ alias, label: alias });
  }
  return forms;
}

function matchBodyType(
  text: string,
  aliases?: VehicleSlotAlias[],
): { alias: string; token: string } | undefined {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return undefined;
  }
  const forms = bodyForms(aliases);
  const exact = forms.find((form) => form.label === normalized);
  if (exact) {
    return { alias: exact.alias, token: exact.label };
  }
  const inside = forms
    .filter((form) => new RegExp(`\\b${escapeRegExp(form.label)}\\b`, 'iu').test(normalized))
    .sort((left, right) => right.label.length - left.label.length)[0];
  if (inside) {
    return { alias: inside.alias, token: inside.label };
  }
  const tokens = normalized.split(' ').filter((token) => token.length > 0);
  let best: { alias: string; token: string; distance: number } | undefined;
  let tied = false;
  for (const token of tokens) {
    if (token.length < 4) {
      continue;
    }
    for (const form of forms) {
      if (Math.abs(token.length - form.label.length) > 2) {
        continue;
      }
      const distance = levenshtein(token, form.label);
      if (distance === 0 || distance > 2) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { alias: form.alias, token, distance };
        tied = false;
      } else if (distance === best.distance && form.alias !== best.alias) {
        tied = true;
      }
    }
  }
  if (!best || tied) {
    return undefined;
  }
  return { alias: best.alias, token: best.token };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyReply(
  entities: RouterEntities,
  missing: VehicleSlotKey,
  message: string,
  aliases?: VehicleSlotAlias[],
): void {
  const peeled = peelMessage(entities, message, aliases, missing);
  if (!peeled.rest) {
    return;
  }
  if (missing === 'generation') {
    if (!entities.generation) {
      entities.generation = peeled.rest;
    }
    return;
  }
  if (!entities.car_brand && !peeled.modelAliasHit && missing === 'car_brand') {
    entities.car_brand = peeled.rest;
    return;
  }
  if (!entities.car_model && (entities.car_brand || peeled.modelAliasHit)) {
    entities.car_model = peeled.rest;
  }
}

function peelMessage(
  entities: RouterEntities,
  message: string,
  aliases: VehicleSlotAlias[] | undefined,
  missing?: VehicleSlotKey,
): { rest: string; modelAliasHit: boolean } {
  let rest = message.replace(/[,.;:()]+/gu, ' ');
  rest = peelYear(entities, rest);
  rest = peelExactBody(entities, rest, aliases);
  rest = collapse(rest);
  rest = peelBrand(entities, rest, aliases);
  rest = collapse(rest);
  const model = peelModel(entities, rest, aliases);
  rest = collapse(model.rest);
  rest = peelFuzzyBody(entities, rest, aliases, missing);
  rest = peelGeneration(entities, rest);
  return { rest: dropOfferWords(rest), modelAliasHit: model.modelAliasHit };
}

function peelYear(entities: RouterEntities, rest: string): string {
  const year = readYear(rest);
  if (year !== undefined) {
    rest = stripWord(rest, String(year));
    if (entities.year === undefined) {
      entities.year = year;
    }
  }
  rest = rest.replace(/\b(?:19|20)\d{2}\b/gu, ' ');
  return rest.replace(/\b(rok|rocznik)\b/giu, ' ');
}

function peelExactBody(
  entities: RouterEntities,
  rest: string,
  aliases: VehicleSlotAlias[] | undefined,
): string {
  const exactBody = matchExactBody(rest, aliases);
  if (!exactBody || entities.body_type !== undefined) {
    return rest;
  }
  entities.body_type = exactBody.alias;
  return stripWord(rest, exactBody.token);
}

function peelBrand(
  entities: RouterEntities,
  rest: string,
  aliases: VehicleSlotAlias[] | undefined,
): string {
  if (entities.car_brand) {
    return stripStoredBrand(rest, entities.car_brand, aliases);
  }
  const taken = takeAlias(rest, brandAliases(aliases));
  if (taken.hit) {
    entities.car_brand = taken.hit;
    return taken.rest;
  }
  return rest;
}

function peelModel(
  entities: RouterEntities,
  rest: string,
  aliases: VehicleSlotAlias[] | undefined,
): { rest: string; modelAliasHit: boolean } {
  if (!rest || entities.car_model) {
    return { rest, modelAliasHit: false };
  }
  const taken = takeAlias(rest, modelAliases(aliases, entities.car_brand));
  if (!taken.hit) {
    return { rest, modelAliasHit: false };
  }
  entities.car_model = taken.hit;
  return { rest: taken.rest, modelAliasHit: true };
}

function peelFuzzyBody(
  entities: RouterEntities,
  rest: string,
  aliases: VehicleSlotAlias[] | undefined,
  missing: VehicleSlotKey | undefined,
): string {
  if (!rest || entities.body_type !== undefined || missing === 'generation') {
    return rest;
  }
  const fuzzyBody = matchBodyType(rest, aliases);
  if (!fuzzyBody) {
    return rest;
  }
  entities.body_type = fuzzyBody.alias;
  return collapse(stripWord(rest, fuzzyBody.token));
}

function peelGeneration(entities: RouterEntities, rest: string): string {
  if (!rest || entities.generation) {
    return rest;
  }
  const generation = rest.match(GENERATION_REPLY);
  if (!generation?.[0]) {
    return rest;
  }
  entities.generation = collapse(generation[0]);
  return stripWord(rest, generation[0]);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripWord(value: string, token: string): string {
  return value.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'iu'), ' ');
}

function brandAliases(aliases: VehicleSlotAlias[] | undefined): string[] {
  return aliasLabels(aliases, 'brand');
}

function foldKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function equivalentBrandKeys(
  brand: string | undefined,
  aliases: VehicleSlotAlias[] | undefined,
): string[] {
  const normalizedBrand = brand ? foldKey(brand) : '';
  if (!normalizedBrand) {
    return [];
  }
  const forms = new Set<string>([normalizedBrand]);
  for (const row of aliases ?? []) {
    if (row.slotKind !== 'brand') {
      continue;
    }
    const alias = foldKey(row.aliasNormalized);
    const canonical = foldKey(row.canonicalKey);
    if (alias === normalizedBrand || canonical === normalizedBrand) {
      forms.add(alias);
      forms.add(canonical);
    }
  }
  return [...forms].filter((form) => form.length > 0);
}

function modelAliases(
  aliases: VehicleSlotAlias[] | undefined,
  brand: string | undefined,
): string[] {
  const allowedBrands = new Set(equivalentBrandKeys(brand, aliases));
  return [
    ...new Set(
      (aliases ?? [])
        .filter((row) => row.slotKind === 'model')
        .filter((row) => {
          if (!row.brandKey || allowedBrands.size === 0) {
            return true;
          }
          return allowedBrands.has(foldKey(row.brandKey));
        })
        .map((row) => foldKey(row.aliasNormalized))
        .filter((alias) => alias.length > 0),
    ),
  ].sort((left, right) => right.length - left.length);
}

function aliasLabels(
  aliases: VehicleSlotAlias[] | undefined,
  slotKind: VehicleSlotAlias['slotKind'],
): string[] {
  return [
    ...new Set(
      (aliases ?? [])
        .filter((row) => row.slotKind === slotKind)
        .map((row) => row.aliasNormalized.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter((alias) => alias.length > 0),
    ),
  ].sort((left, right) => right.length - left.length);
}

function takeAlias(rest: string, aliases: string[]): { hit?: string; rest: string } {
  const words = collapse(rest).split(' ').filter((word) => word.length > 0);
  const normalized = words.map((word) => word.toLowerCase());
  for (const alias of aliases) {
    const aliasWords = alias.split(' ');
    for (let start = 0; start + aliasWords.length <= normalized.length; start += 1) {
      const matches = aliasWords.every((word, index) => normalized[start + index] === word);
      if (!matches) {
        continue;
      }
      return {
        hit: words.slice(start, start + aliasWords.length).join(' '),
        rest: words
          .slice(0, start)
          .concat(words.slice(start + aliasWords.length))
          .join(' '),
      };
    }
  }
  return { rest: words.join(' ') };
}

function dropOfferWords(value: string): string {
  return collapse(
    collapse(value)
      .split(' ')
      .filter((word) => !OFFER_WORDS.has(foldOfferWord(word)))
      .join(' '),
  );
}

function foldOfferWord(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function stripStoredBrand(
  rest: string,
  brand: string,
  aliases: VehicleSlotAlias[] | undefined,
): string {
  const forms = equivalentBrandKeys(brand, aliases).sort(
    (left, right) => right.length - left.length,
  );
  return takeAlias(rest, forms).rest;
}

function matchExactBody(
  text: string,
  aliases?: VehicleSlotAlias[],
): { alias: string; token: string } | undefined {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return undefined;
  }
  const inside = bodyForms(aliases)
    .filter((form) => new RegExp(`\\b${escapeRegExp(form.label)}\\b`, 'iu').test(normalized))
    .sort((left, right) => right.label.length - left.label.length)[0];
  if (!inside) {
    return undefined;
  }
  return { alias: inside.alias, token: inside.label };
}

export function splitGluedBrand(
  entities: RouterEntities,
  message: string,
  aliases?: VehicleSlotAlias[],
): void {
  if (!entities.car_brand || entities.car_model) {
    return;
  }
  const probe: RouterEntities = {};
  const peeled = peelMessage(probe, message, aliases);
  if (peeled.rest && probe.car_brand && !probe.car_model) {
    probe.car_model = peeled.rest;
  }
  if (!probe.car_brand || !probe.car_model) {
    return;
  }
  const stored = collapse(entities.car_brand).toLowerCase();
  const peeledBrand = collapse(probe.car_brand).toLowerCase();
  if (stored !== peeledBrand && stored.includes(peeledBrand)) {
    entities.car_brand = probe.car_brand;
    entities.car_model = probe.car_model;
  }
}

export function harvest(
  entities: RouterEntities,
  message: string,
  aliases?: VehicleSlotAlias[],
): void {
  const hadBrand = Boolean(entities.car_brand);
  const peeled = peelMessage(entities, message, aliases);
  if (!hadBrand && entities.car_brand && peeled.rest && !entities.car_model) {
    entities.car_model = peeled.rest;
  }
}
