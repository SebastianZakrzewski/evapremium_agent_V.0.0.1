/** Public widget id only — never a server secret. */
export const PUBLIC_WIDGET_ID = 'eva-shop';

/**
 * Snippet for the shop HTML. `src` is the hosted widget origin (Vercel/CDN).
 * Slice 7 replaces the placeholder origin with the production CDN URL.
 */
export function shopEmbedSnippet(widgetOrigin: string): string {
  const origin = widgetOrigin.replace(/\/$/, '');
  return `<script src="${origin}/embed.js" data-eva-widget="${PUBLIC_WIDGET_ID}" async></script>`;
}

const SECRET_MARKERS = [
  'DEEPSEEK_API_KEY',
  'BITRIX_WEBHOOK',
  'service_role',
  'SENTRY_DSN',
];

export function snippetContainsSecret(source: string): boolean {
  return SECRET_MARKERS.some((marker) => source.includes(marker));
}

export function parsePublicWidgetId(snippetHtml: string): string | null {
  const match = snippetHtml.match(/data-eva-widget="([^"]+)"/);
  return match?.[1] ?? null;
}
