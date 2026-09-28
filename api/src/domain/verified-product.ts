import type { MatTemplate } from './template-cascade';

/** Matched shop row. `fields` uses catalog column names. The shop chooses which keys its card URL tokens. */
export type VerifiedProduct = {
  productId: string;
  fields: Record<string, string>;
};

function putField(
  fields: Record<string, string>,
  key: string,
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined) {
    return;
  }
  const text = String(value).trim();
  if (text === '') {
    return;
  }
  fields[key] = text;
}

export function verifiedProductFromTemplate(
  template: MatTemplate,
): VerifiedProduct | undefined {
  const productId = template.recordKey.trim();
  if (productId === '' || template.brandKey.trim() === '' || template.modelKey.trim() === '') {
    return undefined;
  }
  const fields: Record<string, string> = {};
  putField(fields, 'brand_key', template.brandKey);
  putField(fields, 'model_key', template.modelKey);
  putField(fields, 'model_family_key', template.modelFamilyKey);
  putField(fields, 'generation', template.generation);
  putField(fields, 'body_type_key', template.bodyTypeKey);
  putField(fields, 'year_from', template.yearFrom);
  putField(fields, 'year_to', template.yearTo);
  return { productId, fields };
}

export function verifiedProductFromStoredKeys(input: {
  productId?: string;
  brandKey?: string;
  modelKey?: string;
  bodyTypeKey?: string;
}): VerifiedProduct | undefined {
  const productId = input.productId?.trim() ?? '';
  const brandKey = input.brandKey?.trim() ?? '';
  const modelKey = input.modelKey?.trim() ?? '';
  if (productId === '' || brandKey === '' || modelKey === '') {
    return undefined;
  }
  const fields: Record<string, string> = {
    brand_key: brandKey,
    model_key: modelKey,
  };
  putField(fields, 'body_type_key', input.bodyTypeKey);
  return { productId, fields };
}
