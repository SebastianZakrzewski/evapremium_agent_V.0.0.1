import type { AgentEventSink } from './agent-event';
import { containerLogs } from './container-log-buffer';
import { recordAgentEvent } from './record-agent-event';
import { currentTurnSessionId } from './turn-session-context';
import { noteTurnTool } from './turn-trace';

export function formatUsedToolLog(toolId: string): string {
  return `użyte narzędzie: "${toolId}"`;
}

export async function executeShopTool<T>(
  events: AgentEventSink | undefined,
  toolId: string,
  execute: () => Promise<T> | T,
): Promise<T> {
  containerLogs.appendTool(toolId);
  noteTurnTool(currentTurnSessionId(), toolId);
  console.info(formatUsedToolLog(toolId));
  try {
    return await execute();
  } catch (error) {
    recordAgentEvent(events, 'tool_failed', { toolId });
    throw error;
  }
}
