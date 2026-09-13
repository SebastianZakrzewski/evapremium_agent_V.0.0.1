import type { AgentEventSink } from './agent-event';
import { recordAgentEvent } from './record-agent-event';

export async function executeShopTool<T>(
  events: AgentEventSink | undefined,
  toolId: string,
  execute: () => Promise<T> | T,
): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    recordAgentEvent(events, 'tool_failed', { toolId });
    throw error;
  }
}
