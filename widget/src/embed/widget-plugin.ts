import { PUBLIC_WIDGET_ID } from './shop-snippet';
import { parseWidgetConfig, type WidgetConfig } from './widget-config';

/** Global the plugin user sets on the host page before `widget-plugin.js` runs. */
export const WIDGET_PLUGIN_GLOBAL = 'widgetPlugin';

export type WidgetPluginInstall = {
  config: WidgetConfig;
  iframeSrc: string;
};

/**
 * Reads the host's widget object and builds the chat frame URL.
 * `showProduct` is carried as query fields. An invalid object does not install.
 */
export function installWidgetPlugin(
  widgetOrigin: string,
  widgetId: string,
  config: WidgetConfig,
): WidgetPluginInstall | null {
  const id = widgetId.trim();
  if (id === '') {
    return null;
  }
  const parsed = parseWidgetConfig(config);
  if (!parsed) {
    return null;
  }
  let page: URL;
  try {
    page = new URL('/', widgetOrigin.trim());
  } catch {
    return null;
  }
  page.searchParams.set('widget', id);
  if (parsed.showProduct) {
    page.searchParams.set('productId', parsed.showProduct.productId);
    page.searchParams.set('cardUrl', parsed.showProduct.cardUrl);
  }
  return { config: parsed, iframeSrc: page.toString() };
}

/** Script tag a host pastes. The user fills `window.widgetPlugin` before it. */
export function widgetPluginSnippet(widgetOrigin: string): string {
  const origin = widgetOrigin.replace(/\/$/, '');
  return `<script src="${origin}/widget-plugin.js" data-eva-widget="${PUBLIC_WIDGET_ID}" async></script>`;
}
