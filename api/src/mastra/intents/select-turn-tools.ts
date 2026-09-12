export function selectTurnTools<T>(
  catalog: Record<string, T>,
  toolIds: readonly string[],
): Record<string, T> {
  const selected: Record<string, T> = {};
  for (const id of toolIds) {
    const tool = catalog[id];
    if (tool === undefined) {
      throw new Error(`unknown shop tool: ${id}`);
    }
    selected[id] = tool;
  }
  return selected;
}

export function profileAllowsTool(
  toolIds: readonly string[],
  toolId: string,
): boolean {
  return toolIds.includes(toolId);
}
