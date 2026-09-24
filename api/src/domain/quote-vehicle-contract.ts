export const QUOTE_VEHICLE_TOOL = 'quote-vehicle' as const;

export type QuoteVehicleOutcomeStatus =
  | 'none'
  | 'many'
  | 'need_variant'
  | 'quoted';
