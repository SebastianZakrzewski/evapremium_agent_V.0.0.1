import type {
  PricingCategoryVariant,
  PricingMatrixRow,
  PricingVariant,
} from '../../domain/pricing';
import type { DataStore } from '../../supabase/data-store';

type CatalogVersionRow = { id: string; is_active: boolean };
type CategoryRow = { id: string; slug: string };
type VariantRow = { id: string; variant_key: string; variant_label: string };
type CategoryVariantRow = {
  vehicle_category_id: string;
  variant_id: string;
  is_active: boolean;
};
type MatrixRow = {
  catalog_version_id: string;
  vehicle_category_id: string;
  variant_id: string;
  mat_type: PricingMatrixRow['matType'];
  base_price_pln: number | string;
};

export async function loadPricingLists(store: DataStore): Promise<{
  variants: PricingVariant[];
  categoryVariants: PricingCategoryVariant[];
  matrix: PricingMatrixRow[];
}> {
  const versions = await store.selectAll<CatalogVersionRow>(
    'evapremium_shop',
    'pricing_catalog_versions',
  );
  const active = versions.find((row) => row.is_active);
  const categories = await store.selectAll<CategoryRow>(
    'evapremium_shop',
    'pricing_vehicle_categories',
  );
  const variantRows = await store.selectAll<VariantRow>(
    'evapremium_shop',
    'pricing_variants',
  );
  const categoryVariantRows = await store.selectAll<CategoryVariantRow>(
    'evapremium_shop',
    'pricing_category_variants',
  );
  const matrixRows = await store.selectAll<MatrixRow>(
    'evapremium_shop',
    'pricing_matrix',
  );

  const categoryById = new Map(categories.map((row) => [row.id, row.slug]));
  const variantById = new Map(
    variantRows.map((row) => [row.id, { key: row.variant_key, label: row.variant_label }]),
  );

  const variants: PricingVariant[] = variantRows.map((row) => ({
    variantKey: row.variant_key,
    variantLabel: row.variant_label,
  }));

  const categoryVariants: PricingCategoryVariant[] = categoryVariantRows.flatMap(
    (row) => {
      if (!row.is_active) {
        return [];
      }
      const dealerPricingCategoryKey = categoryById.get(row.vehicle_category_id);
      const variant = variantById.get(row.variant_id);
      if (!dealerPricingCategoryKey || !variant) {
        return [];
      }
      return [{ dealerPricingCategoryKey, variantKey: variant.key }];
    },
  );

  const matrix: PricingMatrixRow[] = matrixRows.flatMap((row) => {
    if (active && row.catalog_version_id !== active.id) {
      return [];
    }
    const dealerPricingCategoryKey = categoryById.get(row.vehicle_category_id);
    const variant = variantById.get(row.variant_id);
    if (!dealerPricingCategoryKey || !variant) {
      return [];
    }
    return [
      {
        dealerPricingCategoryKey,
        variantKey: variant.key,
        matType: row.mat_type,
        amount: Number(row.base_price_pln),
      },
    ];
  });

  return { variants, categoryVariants, matrix };
}
