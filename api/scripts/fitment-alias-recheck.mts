import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advanceFitmentCascade } from '../src/domain/fitment-session';
import {
  mapAliases,
  normalizeSlots,
  resolveClassifiedTemplate,
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
    { api_key?: string; url?: string; key?: string }
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

const cases = [
  { name: 'Acura MDX 2016', brand: 'Acura', spoken: 'MDX', year: 2016, body: 'suv', expectModelKey: 'MDX 3 gen' },
  { name: 'Acura MDX 2007', brand: 'Acura', spoken: 'MDX', year: 2007, body: 'suv', expectModelKey: 'MDX 2 gen' },
  { name: 'VW Golf 7', brand: 'Volkswagen', spoken: 'Golf 7', year: 2015, body: 'hatchback', expectModelKey: 'Golf(MK7) VII gen' },
  { name: 'VW Golf 8', brand: 'Volkswagen', spoken: 'Golf 8', year: 2021, body: 'hatchback', expectModelKey: 'Golf(MK8) VIII gen' },
  { name: 'BMW X5 2010', brand: 'BMW', spoken: 'X5', year: 2010, body: 'suv', expectModelKey: 'X5 (E70) 2 gen' },
  { name: 'Audi A4 2012', brand: 'Audi', spoken: 'A4', year: 2012, body: 'sedan', expectModelKey: 'A4(B8) polift 4 gen' },
  { name: 'Skoda Octavia 2018', brand: 'Skoda', spoken: 'Octavia', year: 2018, body: 'liftback', expectModelKey: 'Octavia(A7) polift 3 gen' },
  { name: 'Toyota Corolla 2022', brand: 'Toyota', spoken: 'Corolla', year: 2022, body: 'sedan', expectModelKey: 'Corolla 12 gen' },
];

function caching(real: VehicleKeyClassifier) {
  const modelCache = new Map<string, string[]>();
  const brandCache = new Map<string, string | null>();
  const stats = { modelCalls: 0, brandCalls: 0 };
  return {
    stats,
    async classifyBrand(input: Parameters<VehicleKeyClassifier['classifyBrand']>[0]) {
      const key = JSON.stringify(input);
      if (brandCache.has(key)) return brandCache.get(key) ?? null;
      stats.brandCalls += 1;
      const value = await real.classifyBrand(input);
      brandCache.set(key, value);
      return value;
    },
    async classifyModel(input: Parameters<VehicleKeyClassifier['classifyModel']>[0]) {
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

async function main(): Promise<void> {
  const store = createSupabaseDataStore();
  const [templates, aliases] = await Promise.all([
    loadMatTemplates(store),
    loadVehicleSlotAliases(store),
  ]);
  const real = vehicleKeyClassifierFromEnv();
  if (!real) throw new Error('DEEPSEEK_API_KEY missing');
  const classifier = caching(real);
  const resolve = (input: Parameters<typeof resolveClassifiedTemplate>[0]) =>
    resolveClassifiedTemplate(input, templates, aliases, classifier);

  const report = [];
  for (const item of cases) {
    const before = classifier.stats.modelCalls;
    const aliasHit = Boolean(
      mapAliases(normalizeSlots({ brand: item.brand, model: item.spoken }), aliases).modelKey,
    );
    const classified = await resolve({
      brand: item.brand,
      model: item.spoken,
      year: item.year,
      bodyType: item.body,
    });
    const keys =
      classified.status === 'none'
        ? []
        : classified.status === 'one'
          ? [classified.template.modelKey]
          : [...new Set(classified.templates.map((row) => row.modelKey))];
    const brandOnly = await advanceFitmentCascade({
      slots: { car_brand: item.brand },
      resolve,
      aliases,
    });
    const asksModel =
      brandOnly.status === 'suspended' &&
      brandOnly.snapshot.missing === 'car_model' &&
      brandOnly.snapshot.slots.car_model === undefined;

    let slots: RouterEntities = { car_brand: item.brand };
    let asked: 'car_model' | 'year' | 'body_type' | 'car_brand' | undefined = 'car_model';
    let message: string | undefined = item.spoken;
    const turns: string[] = [];
    let final = '';
    for (let step = 0; step < 4; step += 1) {
      const advance = await advanceFitmentCascade({ slots, message, asked, resolve, aliases });
      if (advance.status === 'ready') {
        const readyKeys =
          advance.result.status === 'none'
            ? []
            : advance.result.status === 'one'
              ? [advance.result.template.modelKey]
              : [...new Set(advance.result.templates.map((row) => row.modelKey))];
        final = `${advance.result.status}:${readyKeys.join('|')}`;
        turns.push(final);
        break;
      }
      turns.push(advance.snapshot.missing);
      slots = advance.snapshot.slots;
      asked = advance.snapshot.missing;
      if (advance.snapshot.missing === 'year') message = String(item.year);
      else if (advance.snapshot.missing === 'body_type') message = item.body;
      else message = item.spoken;
    }
    const row = {
      name: item.name,
      aliasHit,
      modelCalls: classifier.stats.modelCalls - before,
      classification: classified.status,
      keys,
      classificationOk: keys.includes(item.expectModelKey),
      asksModel,
      turns,
      workflowOk:
        asksModel &&
        final.startsWith('one:') &&
        final.includes(item.expectModelKey),
    };
    report.push(row);
    console.log(JSON.stringify(row));
  }
  const passed = report.filter((row) => row.classificationOk && row.workflowOk).length;
  console.log(JSON.stringify({ passed, total: report.length, modelCalls: classifier.stats.modelCalls }));
}

void main();
