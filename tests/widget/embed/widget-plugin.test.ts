import { describe, expect, it } from 'vitest';
import pluginJs from '@widget-root/public/widget-plugin.js?raw';
import pluginDoc from '@widget-root/public/widget-plugin.md?raw';
import { PUBLIC_WIDGET_ID, snippetContainsSecret } from '@widget/embed/shop-snippet';
import {
  installWidgetPlugin,
  WIDGET_PLUGIN_GLOBAL,
  widgetPluginSnippet,
} from '@widget/embed/widget-plugin';

describe('widget plugin', () => {
  it('installs the chat frame from the shop widget object', () => {
    expect(
      installWidgetPlugin('https://widget.example.cdn', 'eva-shop', {
        showProduct: {
          productId: ' audi-a4 ',
          cardUrl: 'https://shop.example/cards/audi-a4',
        },
      }),
    ).toEqual({
      config: {
        showProduct: {
          productId: 'audi-a4',
          cardUrl: 'https://shop.example/cards/audi-a4',
        },
      },
      iframeSrc:
        'https://widget.example.cdn/?widget=eva-shop&productId=audi-a4&cardUrl=https%3A%2F%2Fshop.example%2Fcards%2Faudi-a4',
    });
  });

  it('installs chat when the shop leaves the domain fields empty', () => {
    expect(installWidgetPlugin('https://widget.example.cdn/', 'other-shop', {})).toEqual({
      config: {},
      iframeSrc: 'https://widget.example.cdn/?widget=other-shop',
    });
  });

  it('does not install when showProduct is not a shop card address', () => {
    expect(
      installWidgetPlugin('https://widget.example.cdn', 'eva-shop', {
        showProduct: { productId: 'audi-a4', cardUrl: 'http://shop.example/cards/audi-a4' },
      }),
    ).toBeNull();
  });

  it('exposes a public plugin script the host configures through window.widgetPlugin', () => {
    const snippet = widgetPluginSnippet('https://widget.example.cdn');
    expect(snippet).toContain('https://widget.example.cdn/widget-plugin.js');
    expect(snippet).toContain(`data-eva-widget="${PUBLIC_WIDGET_ID}"`);
    expect(pluginJs).toContain(WIDGET_PLUGIN_GLOBAL);
    expect(pluginJs).toContain('showProduct');
    expect(pluginJs).not.toContain('EVA Premium');
    expect(snippetContainsSecret(pluginJs)).toBe(false);
    expect(snippetContainsSecret(snippet)).toBe(false);
  });

  it('ships the agent document next to the plugin script', () => {
    expect(pluginDoc).toContain('window.widgetPlugin');
    expect(pluginDoc).toContain('showProduct');
    expect(pluginDoc).toContain('widget-plugin.js');
    expect(pluginDoc).toContain(
      'https://raw.githubusercontent.com/SebastianZakrzewski/evapremium_agent_V.0.0.1/main/widget/public/widget-plugin.md',
    );
  });
});
