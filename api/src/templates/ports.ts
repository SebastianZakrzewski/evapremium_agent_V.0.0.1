import type { MatTemplate, VehicleSlotAlias } from '../domain/template-cascade';

export const TEMPLATE_CATALOG = Symbol('TEMPLATE_CATALOG');
export const ALIAS_CATALOG = Symbol('ALIAS_CATALOG');

export interface TemplateCatalog {
  list(): MatTemplate[];
}

export interface AliasCatalog {
  list(): VehicleSlotAlias[];
}
