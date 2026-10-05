import { levenshtein } from '../levenshtein';
import { collapseWhitespace } from './alias-map';
import { matchesYear } from './template-match';
import { MODEL_KEY_SHORTLIST_LIMIT, type MatTemplate } from './types';

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
