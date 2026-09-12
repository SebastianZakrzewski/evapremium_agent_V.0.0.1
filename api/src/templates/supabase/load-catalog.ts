import type { MatTemplate, VehicleSlotAlias } from '../../domain/template-cascade';
import type { DataStore } from '../../supabase/data-store';

type TemplateRow = {
  id: string;
  record_key: string;
  brand_key: string;
  model_key: string;
  dealer_pricing_category_key: string;
  is_active: boolean;
  year_from: number | null;
  year_to: number | null;
  is_open_ended: boolean;
  body_type_key: string | null;
  body_type_1_key: string | null;
  body_type_2_key: string | null;
  body_type_3_key: string | null;
};

type AliasRow = {
  slot_kind: 'brand' | 'model' | 'body_type';
  alias_normalized: string;
  canonical_key: string;
  brand_key: string | null;
};

export function mapMatTemplateRow(row: TemplateRow): MatTemplate {
  return {
    id: row.id,
    recordKey: row.record_key,
    brandKey: row.brand_key,
    modelKey: row.model_key,
    dealerPricingCategoryKey: row.dealer_pricing_category_key,
    isActive: row.is_active,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    isOpenEnded: row.is_open_ended,
    bodyTypeKey: row.body_type_key,
    bodyType1Key: row.body_type_1_key,
    bodyType2Key: row.body_type_2_key,
    bodyType3Key: row.body_type_3_key,
  };
}

export async function loadMatTemplates(store: DataStore): Promise<MatTemplate[]> {
  const rows = await store.selectAll<TemplateRow>('evapremium_shop', 'mat_templates');
  return rows.map(mapMatTemplateRow);
}

export async function loadVehicleSlotAliases(
  store: DataStore,
): Promise<VehicleSlotAlias[]> {
  const rows = await store.selectAll<AliasRow>('eva_bot', 'vehicle_slot_aliases');
  return rows.map((row) => ({
    slotKind: row.slot_kind,
    aliasNormalized: row.alias_normalized,
    canonicalKey: row.canonical_key,
    brandKey: row.brand_key,
  }));
}
