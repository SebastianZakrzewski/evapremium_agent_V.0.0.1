import type { AgentEventSink } from './agent-event';
import { recordAgentEvent } from './record-agent-event';

export function formatUsedToolLog(toolId: string): string {
  return `użyte narzędzie: "${toolId}"`;
}

export async function executeShopTool<T>(
  events: AgentEventSink | undefined,
  toolId: string,
  execute: () => Promise<T> | T,
): Promise<T> {
  console.info(formatUsedToolLog(toolId));
  try {
    return await execute();
  } catch (error) {
    recordAgentEvent(events, 'tool_failed', { toolId });
    throw error;
  }
}
