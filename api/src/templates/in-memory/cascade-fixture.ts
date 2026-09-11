import type { MatTemplate, VehicleSlotAlias } from '../../domain/template-cascade';

const golfMk8Hatch: MatTemplate = {
  id: 'tmpl-golf-mk8-hatch',
  recordKey: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|hatchback|1',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK8) 8 gen',
  dealerPricingCategoryKey: 'passenger_car',
  isActive: true,
  yearFrom: 2019,
  yearTo: null,
  isOpenEnded: true,
  bodyTypeKey: 'hatchback',
  bodyType1Key: 'hatchback',
  bodyType2Key: null,
  bodyType3Key: null,
};

const golfMk8Wagon: MatTemplate = {
  id: 'tmpl-golf-mk8-wagon',
  recordKey: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|wagon|2',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK8) 8 gen',
  dealerPricingCategoryKey: 'passenger_car',
  isActive: true,
  yearFrom: 2019,
  yearTo: null,
  isOpenEnded: true,
  bodyTypeKey: 'wagon',
  bodyType1Key: 'wagon',
  bodyType2Key: null,
  bodyType3Key: null,
};

const golfMk7Hatch: MatTemplate = {
  id: 'tmpl-golf-mk7-hatch',
  recordKey: 'passenger_car|volkswagen|golfmk7_7_gen|2012-2020|hatchback|3',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK7) 7 gen',
  dealerPricingCategoryKey: 'passenger_car',
  isActive: true,
  yearFrom: 2012,
  yearTo: 2020,
  isOpenEnded: false,
  bodyTypeKey: 'hatchback',
  bodyType1Key: 'hatchback',
  bodyType2Key: null,
  bodyType3Key: null,
};

const golfMk7Wagon: MatTemplate = {
  id: 'tmpl-golf-mk7-wagon',
  recordKey: 'passenger_car|volkswagen|golfmk7_7_gen|2012-2020|wagon|4',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK7) 7 gen',
  dealerPricingCategoryKey: 'passenger_car',
  isActive: true,
  yearFrom: 2012,
  yearTo: 2020,
  isOpenEnded: false,
  bodyTypeKey: 'wagon',
  bodyType1Key: 'wagon',
  bodyType2Key: null,
  bodyType3Key: null,
};

const audiA4Sedan: MatTemplate = {
  id: 'tmpl-audi-a4-sedan',
  recordKey: 'passenger_car|audi|a4|2015-2023|sedan|5',
  brandKey: 'Audi',
  modelKey: 'A4',
  dealerPricingCategoryKey: 'passenger_car',
  isActive: true,
  yearFrom: 2015,
  yearTo: 2023,
  isOpenEnded: false,
  bodyTypeKey: 'sedan',
  bodyType1Key: 'sedan',
  bodyType2Key: null,
  bodyType3Key: null,
};

const inactiveGolf: MatTemplate = {
  id: 'tmpl-golf-inactive',
  recordKey: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|hatchback|dead',
  brandKey: 'Volkswagen',
  modelKey: 'Golf(MK8) 8 gen',
  dealerPricingCategoryKey: 'passenger_car',
  isActive: false,
  yearFrom: 2019,
  yearTo: null,
  isOpenEnded: true,
  bodyTypeKey: 'hatchback',
  bodyType1Key: 'hatchback',
  bodyType2Key: null,
  bodyType3Key: null,
};

export const CASCADE_TEMPLATES: MatTemplate[] = [
  golfMk8Hatch,
  golfMk8Wagon,
  golfMk7Hatch,
  golfMk7Wagon,
  audiA4Sedan,
  inactiveGolf,
];

export const CASCADE_ALIASES: VehicleSlotAlias[] = [
  {
    slotKind: 'brand',
    aliasNormalized: 'vw',
    canonicalKey: 'Volkswagen',
    brandKey: null,
  },
  {
    slotKind: 'brand',
    aliasNormalized: 'volkswagen',
    canonicalKey: 'Volkswagen',
    brandKey: null,
  },
  {
    slotKind: 'brand',
    aliasNormalized: 'audi',
    canonicalKey: 'Audi',
    brandKey: null,
  },
  {
    slotKind: 'model',
    aliasNormalized: 'golf 8',
    canonicalKey: 'Golf(MK8) 8 gen',
    brandKey: 'Volkswagen',
  },
  {
    slotKind: 'model',
    aliasNormalized: 'golf mk8',
    canonicalKey: 'Golf(MK8) 8 gen',
    brandKey: 'Volkswagen',
  },
  {
    slotKind: 'model',
    aliasNormalized: 'golf 7',
    canonicalKey: 'Golf(MK7) 7 gen',
    brandKey: 'Volkswagen',
  },
  {
    slotKind: 'model',
    aliasNormalized: 'a4',
    canonicalKey: 'A4',
    brandKey: 'Audi',
  },
  {
    slotKind: 'body_type',
    aliasNormalized: 'kombi',
    canonicalKey: 'wagon',
    brandKey: null,
  },
  {
    slotKind: 'body_type',
    aliasNormalized: 'wagon',
    canonicalKey: 'wagon',
    brandKey: null,
  },
  {
    slotKind: 'body_type',
    aliasNormalized: 'hatch',
    canonicalKey: 'hatchback',
    brandKey: null,
  },
  {
    slotKind: 'body_type',
    aliasNormalized: 'hatchback',
    canonicalKey: 'hatchback',
    brandKey: null,
  },
];
