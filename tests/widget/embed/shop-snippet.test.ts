import { describe, expect, it } from 'vitest';
import embedJs from '@widget-root/public/embed.js?raw';
import {
  parsePublicWidgetId,
  PUBLIC_WIDGET_ID,
  shopEmbedSnippet,
  snippetContainsSecret,
} from '@widget/embed/shop-snippet';

describe('shop embed snippet', () => {
  it('exposes a public widget id and loads the script from the widget origin', () => {
    const snippet = shopEmbedSnippet('https://widget.example.cdn');
    expect(parsePublicWidgetId(snippet)).toBe(PUBLIC_WIDGET_ID);
    expect(snippet).toContain('https://widget.example.cdn/embed.js');
    expect(snippetContainsSecret(snippet)).toBe(false);
  });

  it('keeps embed.js free of server secrets', () => {
    expect(embedJs).toContain('data-eva-widget');
    expect(snippetContainsSecret(embedJs)).toBe(false);
  });
});
