/**
 * Sloty auta z wypowiedzi klienta: marka, model, rocznik, nadwozie, generacja.
 * Regułą zbierania jest `advanceVehicleSlots` i `advanceQuoteVehicle`.
 * `collectVehicleStep` tylko tłumaczy wynik na suspend/complete workflow Mastry.
 */

export {
  QUOTE_VEHICLE_WORKFLOW,
  type QuoteVehicleAdvance,
  type QuoteWorkflowSnapshot,
  type VehicleSlotKey,
} from './vehicle/types';
export {
  readBodyType,
  readVehicleReply,
  readYear,
} from './vehicle/parse-utterance';
export {
  advanceQuoteVehicle,
  advanceVehicleSlots,
  isSlotReply,
} from './vehicle/advance-vehicle-slots';
export { collectVehicleStep } from './vehicle/collect-vehicle-step';
