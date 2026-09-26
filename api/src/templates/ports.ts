import type {
  MatTemplate,
  VehicleKeyClassifier,
  VehicleSlotAlias,
} from '../domain/template-cascade';

export const TEMPLATE_CATALOG = Symbol('TEMPLATE_CATALOG');
export const ALIAS_CATALOG = Symbol('ALIAS_CATALOG');
export const VEHICLE_KEY_CLASSIFIER = Symbol('VEHICLE_KEY_CLASSIFIER');

export type { VehicleKeyClassifier };

export interface TemplateCatalog {
  list(): MatTemplate[];
}

export interface AliasCatalog {
  list(): VehicleSlotAlias[];
}
