import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advanceFitmentCascade } from '../src/domain/fitment-session';
import {
  mapAliases,
  normalizeSlots,
  resolveClassifiedTemplate,
  type MatTemplate,
  type VehicleKeyClassifier,
} from '../src/domain/template-cascade';
import type { RouterEntities } from '../src/domain/sub-intent-catalog';
import { vehicleKeyClassifierFromEnv } from '../src/mastra/vehicle-keys/mastra-vehicle-key-classifier';
import { createSupabaseDataStore } from '../src/supabase/supabase-data-store';
import {
  loadMatTemplates,
  loadVehicleSlotAliases,
} from '../src/templates/supabase/load-catalog';

function applyEnvFile(path: string): void {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
  }
}

function applyProviderJson(path: string): void {
  const cfg = JSON.parse(readFileSync(path, 'utf8')) as Record<
    string,
    { api_key?: string; key?: string; url?: string }
  >;
  const deepseek = cfg['deepseek-api-key']?.api_key;
  if (deepseek && !process.env.DEEPSEEK_API_KEY) process.env.DEEPSEEK_API_KEY = deepseek;
  const supabase = cfg['supabase-service-role-key'];
  if (supabase?.url && !process.env.SUPABASE_URL) process.env.SUPABASE_URL = supabase.url;
  if (supabase?.key && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabase.key;
  }
}

applyEnvFile(resolve(__dirname, '../.env'));
applyProviderJson(resolve(__dirname, '../../docs/provider_configuration.json'));

type Case = {
  name: string;
  brand: string;
  spoken: string;
  year: number;
  body: string;
  expectModelKey: string;
};

function yearInside(template: MatTemplate): number {
  const from = template.yearFrom ?? 2020;
  if (template.isOpenEnded || template.yearTo === null) return Math.max(from, from);
  return Math.min(template.yearTo, Math.max(from, from + 1));
}

function spokenFromKey(modelKey: string): string {
  return modelKey
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bgen\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickCases(templates: MatTemplate[]): Case[] {
  const active = templates.filter((row) => row.isActive && row.bodyTypeKey);
  const wanted = ['Acura', 'Audi', 'BMW', 'Skoda', 'Toyota', 'Volkswagen'];
  const cases: Case[] = [];
  for (const brand of wanted) {
    const rows = active.filter((row) => row.brandKey.toLowerCase() === brand.toLowerCase());
    const byModel = new Map<string, MatTemplate[]>();
    for (const row of rows) {
      const list = byModel.get(row.modelKey) ?? [];
      list.push(row);
      byModel.set(row.modelKey, list);
    }
    const keys = [...byModel.keys()].sort();
    const chosen = keys.filter((key) => /golf|mdx|a4|octavia|corolla|3 series|seria|320|x5/i.test(key));
    const pool = chosen.length > 0 ? chosen : keys.slice(0, 2);
    for (const modelKey of pool.slice(0, 2)) {
      const template = byModel.get(modelKey)?.[0];
      if (!template?.bodyTypeKey) continue;
      cases.push({
        name: `${brand} / ${modelKey}`,
        brand,
        spoken: spokenFromKey(modelKey),
        year: yearInside(template),
        body: template.bodyTypeKey,
        expectModelKey: modelKey,
      });
    }
  }
  return cases;
}

function caching(real: VehicleKeyClassifier): VehicleKeyClassifier & { modelCalls: number; brandCalls: number } {
  const modelCache = new Map<string, string[]>();
  const brandCache = new Map<string, string | null>();
  const stats = { modelCalls: 0, brandCalls: 0 };
  return {
    get modelCalls() {
      return stats.modelCalls;
    },
    get brandCalls() {
      return stats.brandCalls;
    },
    async classifyBrand(input) {
      const key = JSON.stringify(input);
      const hit = brandCache.get(key);
      if (hit !== undefined) return hit;
      stats.brandCalls += 1;
      const value = await real.classifyBrand(input);
      brandCache.set(key, value);
      return value;
    },
    async classifyModel(input) {
      const key = JSON.stringify(input);
      const hit = modelCache.get(key);
      if (hit) return hit;
      stats.modelCalls += 1;
      const value = await real.classifyModel(input);
      modelCache.set(key, value);
      return value;
    },
  };
}

const CUSTOMER_CASES: Case[] = [
  { name: 'Acura MDX 2016', brand: 'Acura', spoken: 'MDX', year: 2016, body: 'suv', expectModelKey: 'MDX 3 gen' },
  { name: 'Acura MDX 2007', brand: 'Acura', spoken: 'MDX', year: 2007, body: 'suv', expectModelKey: 'MDX 2 gen' },
  { name: 'VW Golf 7', brand: 'Volkswagen', spoken: 'Golf 7', year: 2015, body: 'hatchback', expectModelKey: 'Golf(MK7) VII gen' },
  { name: 'VW Golf 8', brand: 'Volkswagen', spoken: 'Golf 8', year: 2021, body: 'hatchback', expectModelKey: 'Golf(MK8) VIII gen' },
  { name: 'BMW X5 2010', brand: 'BMW', spoken: 'X5', year: 2010, body: 'suv', expectModelKey: 'X5 (E70) 2 gen' },
  { name: 'Audi A4 2012', brand: 'Audi', spoken: 'A4', year: 2012, body: 'sedan', expectModelKey: 'A4(B8) polift 4 gen' },
  { name: 'Skoda Octavia 2018', brand: 'Skoda', spoken: 'Octavia', year: 2018, body: 'liftback', expectModelKey: 'Octavia(A7) polift 3 gen' },
  { name: 'Toyota Corolla 2022', brand: 'Toyota', spoken: 'Corolla', year: 2022, body: 'sedan', expectModelKey: 'Corolla 12 gen' },
];

async function main(): Promise<void> {
  const store = createSupabaseDataStore();
  const [templates, aliases] = await Promise.all([
    loadMatTemplates(store),
    loadVehicleSlotAliases(store),
  ]);
  const real = vehicleKeyClassifierFromEnv();
  if (!real) throw new Error('DEEPSEEK_API_KEY missing');
  const classifier = caching(real);
  const cases = process.env.SUITE === 'customer' ? CUSTOMER_CASES : pickCases(templates);
  if (process.env.SUITE === 'customer') {
    for (const item of cases) {
      const keys = [
        ...new Set(
          templates
            .filter(
              (row) =>
                row.isActive &&
                row.brandKey.toLowerCase() === item.brand.toLowerCase() &&
                (row.yearFrom === null || item.year >= row.yearFrom) &&
                (row.isOpenEnded || (row.yearTo !== null && item.year <= row.yearTo)) &&
                (row.bodyTypeKey === item.body ||
                  row.bodyType1Key === item.body ||
                  row.bodyType2Key === item.body ||
                  row.bodyType3Key === item.body) &&
                row.modelKey.toLowerCase().includes(item.spoken.split(' ')[0].toLowerCase()),
            )
            .map((row) => row.modelKey),
        ),
      ];
      console.log(JSON.stringify({ preview: item.name, spoken: item.spoken, keys }));
      if (!item.expectModelKey && keys.length === 1) item.expectModelKey = keys[0];
    }
  }
  const active = templates.filter((row) => row.isActive);
  console.log(
    JSON.stringify({
      templates: templates.length,
      active: active.length,
      aliases: aliases.length,
      cases: cases.map((row) => ({
        name: row.name,
        spoken: row.spoken,
        year: row.year,
        body: row.body,
      })),
    }),
  );

  if (process.env.ALIASES === '1') {
    console.log(JSON.stringify(aliases, null, 2));
    return;
  }
  if (process.env.PREVIEW === '1') {
    const corolla = [
      ...new Set(
        templates
          .filter((row) => row.isActive && /corolla/i.test(row.modelKey))
          .map((row) => `${row.brandKey} | ${row.modelKey} | ${row.bodyTypeKey} | ${row.yearFrom}-${row.yearTo ?? (row.isOpenEnded ? '+' : 'x')}`),
      ),
    ].slice(0, 25);
    console.log(JSON.stringify({ corolla }));
    return;
  }
  const report: Array<Record<string, unknown>> = [];
  for (const item of cases) {
    const aliasHit = Boolean(
      mapAliases(normalizeSlots({ brand: item.brand, model: item.spoken }), aliases).modelKey,
    );
    const before = classifier.modelCalls;
    const classified = await resolveClassifiedTemplate(
      { brand: item.brand, model: item.spoken, year: item.year, bodyType: item.body },
      templates,
      aliases,
      classifier,
    );
    const classifiedKeys =
      classified.status === 'none'
        ? []
        : classified.status === 'one'
          ? [classified.template.modelKey]
          : [...new Set(classified.templates.map((row) => row.modelKey))];
    const classificationOk =
      classified.status !== 'none' && classifiedKeys.includes(item.expectModelKey);

    const brandOnly = await advanceFitmentCascade({
      slots: { car_brand: item.brand },
      resolve: (input) => resolveClassifiedTemplate(input, templates, aliases, classifier),
      aliases,
    });
    const asksModel =
      brandOnly.status === 'suspended' &&
      brandOnly.snapshot.missing === 'car_model' &&
      brandOnly.snapshot.slots.car_model === undefined;

    let slots: RouterEntities = { car_brand: item.brand };
    let asked: 'car_brand' | 'car_model' | 'year' | 'body_type' | undefined = 'car_model';
    let message: string | undefined = item.spoken;
    const turns: string[] = [];
    let final = '';
    for (let step = 0; step < 4; step += 1) {
      const advance = await advanceFitmentCascade({
        slots,
        message,
        asked,
        resolve: (input) => resolveClassifiedTemplate(input, templates, aliases, classifier),
        aliases,
      });
      if (advance.status === 'ready') {
        const keys =
          advance.result.status === 'none'
            ? []
            : advance.result.status === 'one'
              ? [advance.result.template.modelKey]
              : [...new Set(advance.result.templates.map((row) => row.modelKey))];
        final = `${advance.result.status}:${keys.join('|')}`;
        turns.push(final);
        break;
      }
      turns.push(`${advance.snapshot.missing}`);
      slots = advance.snapshot.slots;
      asked = advance.snapshot.missing;
      if (advance.snapshot.missing === 'year') message = String(item.year);
      else if (advance.snapshot.missing === 'body_type') message = item.body;
      else if (advance.snapshot.missing === 'car_model') message = item.spoken;
      else message = item.brand;
    }
    const workflowOk =
      asksModel &&
      !turns.includes('car_model') &&
      final.startsWith('one:') &&
      final.includes(item.expectModelKey);
    report.push({
      name: item.name,
      spoken: item.spoken,
      aliasHit,
      modelCalls: classifier.modelCalls - before,
      classification: classified.status,
      keys: classifiedKeys,
      classificationOk,
      asksModel,
      turns,
      workflowOk,
    });
    console.log(JSON.stringify(report[report.length - 1]));
  }

  const passed = report.filter((row) => row.classificationOk && row.workflowOk).length;
  console.log(
    JSON.stringify({
      passed,
      total: report.length,
      modelCalls: classifier.modelCalls,
      brandCalls: classifier.brandCalls,
    }),
  );
}

void main();
