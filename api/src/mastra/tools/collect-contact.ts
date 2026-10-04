import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../chat/shop-tools';
import { COLLECT_CONTACT_TOOL } from '../../domain/collect-contact';

export function createCollectContactTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
    id: COLLECT_CONTACT_TOOL,
    description:
      'Uruchamia zbieranie kontaktu przy wycenie. Wymagane imię i numer telefonu. E-mail opcjonalny. Zapisuje podane pola w profilu sesji. Puste wywołanie zaczyna proces i zwraca waiting.',
    inputSchema: z.object({
      givenName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    outputSchema: z.object({
      status: z.enum(['waiting', 'saved', 'not_saved']),
      missing: z.enum(['given_name', 'phone']).optional(),
      givenName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    execute: async (input) =>
      executeShopTool(events, COLLECT_CONTACT_TOOL, () =>
        tools.collectContact(input),
      ),
  });
}
