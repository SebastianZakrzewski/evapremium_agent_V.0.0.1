export type MatType = '3d-with-rims' | 'classic' | 'single';

export type PricingVariant = {
  variantKey: string;
  variantLabel: string;
};

export type PricingCategoryVariant = {
  dealerPricingCategoryKey: string;
  variantKey: string;
};

export type PricingMatrixRow = {
  dealerPricingCategoryKey: string;
  variantKey: string;
  matType: MatType;
  amount: number;
};

export type QuotePriceInput = {
  dealerPricingCategoryKey: string;
  variantKey: string;
  matType?: MatType;
};

export type CategoryVariantOption = {
  variantKey: string;
  variantLabel: string;
};

export type QuotePriceResult =
  | { status: 'quoted'; amount: number; currency: 'PLN' }
  | { status: 'unknown_variant' }
  | { status: 'mat_type_required' }
  | { status: 'missing_matrix_row' };

export function listCategoryVariants(
  dealerPricingCategoryKey: string,
  categoryVariants: PricingCategoryVariant[],
  variants: PricingVariant[],
): CategoryVariantOption[] {
  const labels = new Map(variants.map((row) => [row.variantKey, row.variantLabel]));
  return categoryVariants
    .filter((row) => row.dealerPricingCategoryKey === dealerPricingCategoryKey)
    .flatMap((row) => {
      const variantLabel = labels.get(row.variantKey);
      return variantLabel === undefined
        ? []
        : [{ variantKey: row.variantKey, variantLabel }];
    });
}

export function listMatTypes(
  dealerPricingCategoryKey: string,
  variantKey: string,
  matrix: PricingMatrixRow[],
): MatType[] {
  const types = matrix
    .filter(
      (row) =>
        row.dealerPricingCategoryKey === dealerPricingCategoryKey &&
        row.variantKey === variantKey,
    )
    .map((row) => row.matType);
  return [...new Set(types)];
}

function isOnCategory(
  categoryVariants: PricingCategoryVariant[],
  dealerPricingCategoryKey: string,
  variantKey: string,
): boolean {
  return categoryVariants.some(
    (row) =>
      row.dealerPricingCategoryKey === dealerPricingCategoryKey &&
      row.variantKey === variantKey,
  );
}

export function quotePrice(
  input: QuotePriceInput,
  categoryVariants: PricingCategoryVariant[],
  matrix: PricingMatrixRow[],
): QuotePriceResult {
  if (
    !isOnCategory(
      categoryVariants,
      input.dealerPricingCategoryKey,
      input.variantKey,
    )
  ) {
    return { status: 'unknown_variant' };
  }

  const rows = matrix.filter(
    (row) =>
      row.dealerPricingCategoryKey === input.dealerPricingCategoryKey &&
      row.variantKey === input.variantKey,
  );

  if (rows.length === 0) {
    return { status: 'missing_matrix_row' };
  }

  if (input.matType !== undefined) {
    const match = rows.find((row) => row.matType === input.matType);
    if (match === undefined) {
      return { status: 'missing_matrix_row' };
    }
    return { status: 'quoted', amount: match.amount, currency: 'PLN' };
  }

  if (rows.length > 1) {
    return { status: 'mat_type_required' };
  }

  const only = rows[0];
  if (only === undefined) {
    return { status: 'missing_matrix_row' };
  }

  return { status: 'quoted', amount: only.amount, currency: 'PLN' };
}
