import {
  PARENT_INTENTS,
  SUB_INTENT_CATALOG,
  subIntentBySlug,
} from '@api/domain/sub-intent-catalog';

describe('sub-intent catalog', () => {
  it('keeps shop sub-intents under the current parent intents', () => {
    expect(SUB_INTENT_CATALOG.map((row) => row.slug)).toEqual([
      'available_colors',
      'material',
      'fitment',
      'delivery_info',
      'indicative_quote',
      'complaint_info',
      'contact_request',
    ]);
    for (const row of SUB_INTENT_CATALOG) {
      expect(PARENT_INTENTS).toContain(row.parentIntent);
      expect(row.description.trim().length).toBeGreaterThan(0);
      expect(subIntentBySlug(row.slug)).toBe(row);
    }
  });

  it('sends an indicative quote action to the fitment workflow', () => {
    const quote = subIntentBySlug('indicative_quote');
    expect(quote?.directTool).toBeUndefined();
    expect(quote?.allowedTools).toEqual(['collect-contact']);
    expect(quote?.requiredInputs).toEqual([
      'car_brand',
      'car_model',
      'year',
      'body_type',
    ]);
    expect(quote?.fallbackWorkflow).toBe('fitment_cascade');
    expect(quote?.allowedModes).toEqual(['knowledge', 'action']);
  });

  it('exposes collect-contact for a contact request', () => {
    const contact = subIntentBySlug('contact_request');
    expect(contact?.parentIntent).toBe('after_sales');
    expect(contact?.directTool).toBe('collect-contact');
    expect(contact?.allowedTools).toEqual(['collect-contact']);
    expect(contact?.allowedModes).toEqual(['action']);
    expect(contact?.requiredInputs).toEqual([]);
  });
});
