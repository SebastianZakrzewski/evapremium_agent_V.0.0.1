import {
  PARENT_INTENTS,
  SUB_INTENT_CATALOG,
  subIntentBySlug,
} from '@api/domain/sub-intent-catalog';

describe('sub-intent catalog', () => {
  it('keeps six shop sub-intents under the current parent intents', () => {
    expect(SUB_INTENT_CATALOG.map((row) => row.slug)).toEqual([
      'available_colors',
      'material',
      'fitment',
      'delivery_info',
      'indicative_quote',
      'complaint_info',
    ]);
    for (const row of SUB_INTENT_CATALOG) {
      expect(PARENT_INTENTS).toContain(row.parentIntent);
      expect(row.description.trim().length).toBeGreaterThan(0);
      expect(subIntentBySlug(row.slug)).toBe(row);
    }
  });

  it('sends an incomplete indicative quote to the vehicle workflow', () => {
    const quote = subIntentBySlug('indicative_quote');
    expect(quote?.directTool).toBe('quote-vehicle');
    expect(quote?.allowedTools).toEqual(['quote-vehicle']);
    expect(quote?.requiredInputs).toEqual(['car_brand', 'car_model']);
    expect(quote?.fallbackWorkflow).toBe('quote_vehicle');
    expect(quote?.allowedModes).toEqual(['knowledge', 'action']);
  });
});
