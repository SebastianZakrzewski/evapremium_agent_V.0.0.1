/**
 * Dopasowanie szablonu dywanika do slotów auta.
 * `resolveTemplate` korzysta tylko z aliasów katalogu.
 * `resolveClassifiedTemplate` dopytuje klasyfikator, gdy alias nie wystarcza.
 */

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
  modelKeys?: string[];
  bodyTypeKey?: string;
};

export const MODEL_KEY_SHORTLIST_LIMIT = 12;

export type BrandClassificationInput = {
  customerBrand: string;
  brandKeys: string[];
};

export type ModelClassificationInput = {
  customerModel: string;
  modelKeys: string[];
  year?: number;
};

export type BodyClassificationInput = {
  customerBody: string;
  bodyKeys: string[];
};

export type GenerationClassificationInput = {
  customerGeneration: string;
  generationKeys: string[];
};

export type VehicleKeyClassifier = {
  classifyBrand(input: BrandClassificationInput): Promise<string | null>;
  classifyModel(input: ModelClassificationInput): Promise<string[]>;
  classifyBody?(input: BodyClassificationInput): Promise<string | null>;
  classifyGeneration?(input: GenerationClassificationInput): Promise<string | null>;
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
  /** Shop card column. Absent on fixtures that do not load the catalog row. */
  modelFamilyKey?: string;
  /** Shop card column. Absent on fixtures that do not load the catalog row. */
  generation?: string;
};

/** Fakt klienta, którego nie ma w szablonach wskazanego wariantu. */
export type SlotMismatch = {
  slot: 'car_brand' | 'car_model' | 'year' | 'body_type' | 'generation';
  value: string;
};

export type TemplateCascadeResult =
  | {
      status: 'none';
      mismatches?: SlotMismatch[];
      bodyTypeKey?: string;
      droppedBrand?: true;
      droppedModel?: true;
    }
  | { status: 'one'; template: MatTemplate; bodyTypeKey?: string; droppedBrand?: true; droppedModel?: true }
  | { status: 'many'; templates: MatTemplate[]; bodyTypeKey?: string; droppedBrand?: true; droppedModel?: true };
