import type { CategoryVariantOption, MatType, QuotePriceInput, QuotePriceResult } from './pricing';
import type { TemplateCascadeInput, TemplateCascadeResult } from './template-cascade';

export type QuoteVehiclePriceInput = {
  brand?: string;
  model?: string;
  bodyType?: string;
  year?: number;
  variantKey?: string;
  matType?: MatType;
};

export type QuoteVehiclePriceResult =
  | { status: 'none' }
  | { status: 'many' }
  | { status: 'need_variant'; options: CategoryVariantOption[] }
  | { status: 'mat_type_required'; matTypes: MatType[] }
  | { status: 'missing_matrix_row' }
  | { status: 'quoted'; amount: number; currency: 'PLN' };

export type QuoteVehiclePorts = {
  resolveTemplate(input: TemplateCascadeInput): TemplateCascadeResult;
  listCategoryVariants(dealerPricingCategoryKey: string): CategoryVariantOption[];
  quotePrice(input: QuotePriceInput): QuotePriceResult;
  matTypes(dealerPricingCategoryKey: string, variantKey: string): MatType[];
};

export function composeQuoteVehicle(
  input: QuoteVehiclePriceInput,
  ports: QuoteVehiclePorts,
): QuoteVehiclePriceResult {
  const cascade = ports.resolveTemplate({
    brand: input.brand,
    model: input.model,
    bodyType: input.bodyType,
    year: input.year,
  });
  if (cascade.status === 'none') {
    return { status: 'none' };
  }
  if (cascade.status === 'many') {
    return { status: 'many' };
  }

  const category = cascade.template.dealerPricingCategoryKey;
  const options = ports.listCategoryVariants(category);
  const variantKey = input.variantKey?.trim();
  if (!variantKey) {
    return { status: 'need_variant', options };
  }

  const priced = ports.quotePrice({
    dealerPricingCategoryKey: category,
    variantKey,
    matType: input.matType,
  });
  if (priced.status === 'quoted') {
    return priced;
  }
  if (priced.status === 'unknown_variant') {
    return { status: 'need_variant', options };
  }
  if (priced.status === 'mat_type_required') {
    return {
      status: 'mat_type_required',
      matTypes: ports.matTypes(category, variantKey),
    };
  }
  return { status: 'missing_matrix_row' };
}
