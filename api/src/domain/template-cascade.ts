/**
 * Dopasowanie szablonu dywanika do slotów auta.
 * `resolveTemplate` korzysta tylko z aliasów katalogu.
 * `resolveClassifiedTemplate` dopytuje klasyfikator, gdy alias nie wystarcza.
 */

export {
  MODEL_KEY_SHORTLIST_LIMIT,
  type BodyClassificationInput,
  type BrandClassificationInput,
  type GenerationClassificationInput,
  type MappedKeys,
  type MatTemplate,
  type ModelClassificationInput,
  type NormalizedSlots,
  type SlotKind,
  type TemplateCascadeInput,
  type TemplateCascadeResult,
  type VehicleKeyClassifier,
  type VehicleSlotAlias,
} from './cascade/types';
export { mapAliases, normalizeSlots } from './cascade/alias-map';
export { resolveTemplate } from './cascade/template-match';
export { activeBrandKeys, shortlistModelKeys } from './cascade/model-shortlist';
export { resolveClassifiedTemplate } from './cascade/resolve-classified-template';
