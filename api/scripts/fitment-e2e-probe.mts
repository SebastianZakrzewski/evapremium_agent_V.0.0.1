import { advanceFitmentCascade } from '../src/domain/fitment-session';
import { prepareIntentTurn } from '../src/mastra/intents/prepare-intent-turn';
import { StubIntentQualifier } from '../src/mastra/intents/stub-intent-qualifier';
import {
  resolveClassifiedTemplate,
  resolveTemplate,
  shortlistModelKeys,
  type MatTemplate,
  type VehicleKeyClassifier,
  type VehicleSlotAlias,
} from '../src/domain/template-cascade';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '../src/templates/in-memory/cascade-fixture';

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

function row(partial: Partial<MatTemplate> & Pick<MatTemplate, 'id' | 'recordKey' | 'brandKey' | 'modelKey'>): MatTemplate {
  return {
    dealerPricingCategoryKey: 'passenger_car',
    isActive: true,
    yearFrom: 2019,
    yearTo: null,
    isOpenEnded: true,
    bodyTypeKey: 'hatchback',
    bodyType1Key: 'hatchback',
    bodyType2Key: null,
    bodyType3Key: null,
    ...partial,
  };
}

const aliasResolve = (input: {
  brand?: string;
  model?: string;
  bodyType?: string;
  year?: number;
  recordKey?: string;
}) => Promise.resolve(resolveTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES));

function yearHit(year: number, templateId: string): boolean {
  const result = resolveTemplate(
    { brand: 'vw', model: 'golf 7', bodyType: 'hatch', year },
    CASCADE_TEMPLATES,
    CASCADE_ALIASES,
  );
  return result.status === 'one' && result.template.id === templateId;
}

function openYearHit(year: number): boolean {
  const result = resolveTemplate(
    { brand: 'vw', model: 'golf 8', bodyType: 'hatch', year },
    CASCADE_TEMPLATES,
    CASCADE_ALIASES,
  );
  return result.status === 'one' && result.template.id === 'tmpl-golf-mk8-hatch';
}

check('rok MK7 przed zakresem', !yearHit(2011, 'tmpl-golf-mk7-hatch'), '2011 odpada');
check('rok MK7 na yearFrom', yearHit(2012, 'tmpl-golf-mk7-hatch'), '2012 zostaje');
check('rok MK7 na yearTo', yearHit(2020, 'tmpl-golf-mk7-hatch'), '2020 zostaje');
check('rok MK7 za zakresem', !yearHit(2021, 'tmpl-golf-mk7-hatch'), '2021 odpada');
check('rok MK8 przed yearFrom', !openYearHit(2018), '2018 odpada');
check('rok MK8 na yearFrom i otwarty koniec', openYearHit(2019) && openYearHit(2099), '2019 i 2099 zostają');

const closedNull = row({
  id: 'closed-null',
  recordKey: 'rk-closed-null',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK8) 8 gen',
  yearFrom: 2019,
  yearTo: null,
  isOpenEnded: false,
  bodyTypeKey: 'coupe',
});
const closedResult = resolveTemplate(
  { brand: 'vw', model: 'golf 8', bodyType: 'coupe', year: 2020 },
  [...CASCADE_TEMPLATES, closedNull],
  [
    ...CASCADE_ALIASES,
    { slotKind: 'body_type', aliasNormalized: 'coupe', canonicalKey: 'coupe', brandKey: null },
  ],
);
check('zamknięty zakres z pustym yearTo', closedResult.status === 'none', closedResult.status);

const sideBody = row({
  id: 'side-body',
  recordKey: 'rk-side',
  brandKey: 'Audi',
  modelKey: 'A4',
  bodyTypeKey: 'sedan',
  bodyType1Key: 'sedan',
  bodyType2Key: 'liftback',
  bodyType3Key: 'fastback',
});
const sideAliases: VehicleSlotAlias[] = [
  ...CASCADE_ALIASES,
  { slotKind: 'body_type', aliasNormalized: 'liftback', canonicalKey: 'liftback', brandKey: null },
  { slotKind: 'body_type', aliasNormalized: 'fastback', canonicalKey: 'fastback', brandKey: null },
];
const lift = resolveTemplate(
  { brand: 'audi', model: 'a4', bodyType: 'liftback', year: 2020 },
  [sideBody],
  sideAliases,
);
const fast = resolveTemplate(
  { brand: 'audi', model: 'a4', bodyType: 'fastback', year: 2020 },
  [sideBody],
  sideAliases,
);
check('nadwozie w bodyType2Key i bodyType3Key', lift.status === 'one' && fast.status === 'one', `${lift.status}/${fast.status}`);

const inactive = resolveTemplate(
  { recordKey: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|hatchback|dead' },
  CASCADE_TEMPLATES,
  CASCADE_ALIASES,
);
check('nieaktywny recordKey', inactive.status === 'none', inactive.status);

const dupLow = row({
  id: 'dup-low',
  recordKey: 'a-low',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK8) 8 gen',
  bodyTypeKey: 'wagon',
});
const dupHigh = row({
  id: 'dup-high',
  recordKey: 'z-high',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK8) 8 gen',
  bodyTypeKey: 'wagon',
});
const collapsed = resolveTemplate(
  { brand: 'vw', model: 'golf 8', bodyType: 'kombi', year: 2021 },
  [dupHigh, dupLow],
  CASCADE_ALIASES,
);
check(
  'duplikat zostawia mniejszy recordKey',
  collapsed.status === 'one' && collapsed.template.recordKey === 'a-low',
  collapsed.status === 'one' ? collapsed.template.recordKey : collapsed.status,
);

const noBrand = await advanceFitmentCascade({
  slots: {},
  resolve: aliasResolve,
  aliases: CASCADE_ALIASES,
});
check('proces: brak marki', noBrand.status === 'suspended' && noBrand.snapshot.missing === 'car_brand', noBrand.status === 'suspended' ? noBrand.snapshot.missing : noBrand.status);

const noModel = await advanceFitmentCascade({
  slots: { car_brand: 'vw' },
  resolve: aliasResolve,
  aliases: CASCADE_ALIASES,
});
check('proces: brak modelu', noModel.status === 'suspended' && noModel.snapshot.missing === 'car_model', noModel.status === 'suspended' ? noModel.snapshot.missing : noModel.status);

const askBody = await advanceFitmentCascade({
  slots: { car_brand: 'vw', car_model: 'golf 8' },
  resolve: aliasResolve,
  aliases: CASCADE_ALIASES,
});
check(
  'proces: Golf 8 pyta o nadwozie',
  askBody.status === 'suspended' && askBody.snapshot.missing === 'body_type',
  askBody.status === 'suspended' ? askBody.snapshot.options?.join(',') ?? '' : askBody.status,
);

const afterBody = askBody.status === 'suspended'
  ? await advanceFitmentCascade({
      slots: askBody.snapshot.slots,
      message: 'kombi',
      asked: askBody.snapshot.missing,
      resolve: aliasResolve,
      aliases: CASCADE_ALIASES,
    })
  : askBody;
check(
  'proces: kombi domyka do jednego szablonu',
  afterBody.status === 'ready' && afterBody.result.status === 'one' && afterBody.result.template.id === 'tmpl-golf-mk8-wagon',
  afterBody.status === 'ready' ? afterBody.result.status : afterBody.status,
);

const badYear = await advanceFitmentCascade({
  slots: { car_brand: 'vw', car_model: 'golf 7', body_type: 'hatch', year: 2001 },
  resolve: aliasResolve,
  aliases: CASCADE_ALIASES,
});
check(
  'brzeg: rok poza zakresem wraca do pytania o rok',
  badYear.status === 'suspended' && badYear.snapshot.missing === 'year' && badYear.snapshot.slots.year === undefined,
  badYear.status === 'suspended' ? `${badYear.snapshot.missing} options=${badYear.snapshot.options?.join(',')}` : badYear.status,
);

const sedanAliases: VehicleSlotAlias[] = [
  ...CASCADE_ALIASES,
  { slotKind: 'body_type', aliasNormalized: 'sedan', canonicalKey: 'sedan', brandKey: null },
];
const badBody = await advanceFitmentCascade({
  slots: { car_brand: 'vw', car_model: 'golf 8', body_type: 'sedan' },
  resolve: (input) => Promise.resolve(resolveTemplate(input, CASCADE_TEMPLATES, sedanAliases)),
  aliases: sedanAliases,
});
check(
  'brzeg: nadwozie zeruje wynik i jest dopytywane',
  badBody.status === 'suspended' && badBody.snapshot.missing === 'body_type' && badBody.snapshot.slots.body_type === undefined,
  badBody.status === 'suspended' ? badBody.snapshot.options?.join(',') ?? '' : badBody.status,
);

const overlap = await advanceFitmentCascade({
  slots: { car_brand: 'volkswagen', car_model: 'golf', year: 2019 },
  resolve: async (input) =>
    resolveClassifiedTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES, {
      classifyBrand: async () => 'Volkswagen',
      classifyModel: async () => ['Golf(MK7) 7 gen', 'Golf(MK8) 8 gen'],
    }),
  aliases: CASCADE_ALIASES,
});
check(
  'brzeg: rok 2019 na styku MK7 i MK8 pyta o nadwozie',
  overlap.status === 'suspended' && overlap.snapshot.missing === 'body_type',
  overlap.status === 'suspended' ? overlap.snapshot.missing : overlap.status,
);

const qualifier = new StubIntentQualifier();
const cascade = {
  resolve: aliasResolve,
  listAliases: () => CASCADE_ALIASES,
};
const firstTurn = await prepareIntentTurn(qualifier, 'Chcę dopasować dywaniki do VW Golf 8', { cascade });
const secondTurn = await prepareIntentTurn(qualifier, 'kombi', {
  cascade,
  fitment: firstTurn.fitment,
});
check(
  'e2e: pierwsza tura wstrzymuje na nadwoziu',
  firstTurn.execution.kind === 'workflow' && firstTurn.fitment?.missing === 'body_type' && firstTurn.toolIds.length === 0,
  `${firstTurn.execution.kind} missing=${firstTurn.fitment?.missing ?? '-'}`,
);
check(
  'e2e: kombi kończy na jednym rekordzie',
  secondTurn.executionNote?.includes('Kaskada: one') === true &&
    secondTurn.verifiedProduct?.productId === 'passenger_car|volkswagen|golfmk8_8_gen|2019-|wagon|2',
  secondTurn.verifiedProduct?.productId ?? secondTurn.executionNote ?? 'brak',
);

const colors = await prepareIntentTurn(qualifier, 'Jakie macie kolory?', {
  cascade,
  fitment: firstTurn.fitment,
});
check('e2e: nowe pytanie zamyka snapshot', colors.clearFitment === true, String(colors.clearFitment));

function catalog(size: number): MatTemplate[] {
  const templates: MatTemplate[] = [];
  const bodies = ['hatchback', 'wagon', 'sedan'];
  for (let index = 0; index < size; index += 1) {
    const brand = `Brand${index % 40}`;
    const model = `Model${Math.floor(index / 40) % 80}`;
    const body = bodies[index % 3]!;
    templates.push(
      row({
        id: `t-${index}`,
        recordKey: `rk-${index}`,
        brandKey: brand,
        modelKey: model,
        yearFrom: 2000 + (index % 20),
        yearTo: 2010 + (index % 20),
        isOpenEnded: false,
        bodyTypeKey: body,
        bodyType1Key: body,
      }),
    );
  }
  return templates;
}

const large = catalog(2500);
const largeAliases: VehicleSlotAlias[] = [
  { slotKind: 'brand', aliasNormalized: 'brand0', canonicalKey: 'Brand0', brandKey: null },
  { slotKind: 'model', aliasNormalized: 'model0', canonicalKey: 'Model0', brandKey: 'Brand0' },
  { slotKind: 'body_type', aliasNormalized: 'hatch', canonicalKey: 'hatchback', brandKey: null },
];
const classifier: VehicleKeyClassifier = {
  classifyBrand: async () => 'Brand0',
  classifyModel: async (input) => [input.modelKeys[0] ?? 'Model0'],
};

function elapsed(run: () => void, times: number): number {
  const start = performance.now();
  for (let index = 0; index < times; index += 1) {
    run();
  }
  return (performance.now() - start) / times;
}

async function elapsedAsync(run: () => Promise<unknown>, times: number): Promise<number> {
  const start = performance.now();
  for (let index = 0; index < times; index += 1) {
    await run();
  }
  return (performance.now() - start) / times;
}

const aliasMs = elapsed(
  () => resolveTemplate({ brand: 'brand0', model: 'model0', bodyType: 'hatch', year: 2005 }, large, largeAliases),
  50,
);
const shortlistMs = elapsed(() => shortlistModelKeys(large, 'Brand0', 'model0', 12, 2005), 50);
const classifiedMs = await elapsedAsync(
  () => resolveClassifiedTemplate({ brand: 'brnd0', model: 'modl0', year: 2005 }, large, largeAliases, classifier),
  30,
);
const recoverMs = await elapsedAsync(
  () =>
    advanceFitmentCascade({
      slots: { car_brand: 'brand0', car_model: 'model0', body_type: 'sedan', year: 1990 },
      resolve: (input) => Promise.resolve(resolveTemplate(input, large, largeAliases)),
      aliases: [
        ...largeAliases,
        { slotKind: 'body_type', aliasNormalized: 'sedan', canonicalKey: 'sedan', brandKey: null },
      ],
    }),
  30,
);

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  timingMs: {
    catalogRows: large.length,
    resolveTemplate: Number(aliasMs.toFixed(3)),
    shortlistModelKeys: Number(shortlistMs.toFixed(3)),
    resolveClassifiedTemplate: Number(classifiedMs.toFixed(3)),
    recoverEmptyCascade: Number(recoverMs.toFixed(3)),
  },
}, null, 2));
if (failed.length > 0) {
  process.exitCode = 1;
}
