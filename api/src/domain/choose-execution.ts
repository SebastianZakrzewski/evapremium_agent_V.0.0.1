import type {
  CatalogToolId,
  RouterEntities,
  SubIntentConfig,
  TurnMode,
} from './sub-intent-catalog';

export type ExecutionChoice =
  | { kind: 'profile' }
  | { kind: 'knowledge'; tools: CatalogToolId[] }
  | { kind: 'tool'; tool: CatalogToolId; tools: CatalogToolId[] }
  | { kind: 'workflow'; workflow: string }
  | { kind: 'clarify' };

function inputPresent(entities: RouterEntities, key: keyof RouterEntities): boolean {
  const value = entities[key];
  return value !== undefined && value.trim() !== '';
}

export function chooseExecution(input: {
  mode: TurnMode;
  entities: RouterEntities;
  config: SubIntentConfig;
}): ExecutionChoice {
  if (
    input.mode === 'ambiguous' ||
    !input.config.allowedModes.includes(input.mode)
  ) {
    return { kind: 'clarify' };
  }

  if (input.mode === 'knowledge') {
    return {
      kind: 'knowledge',
      tools: input.config.allowedTools.filter((tool) => {
        if (tool === 'quote-price' || tool === 'quote-vehicle') {
          return false;
        }
        if (tool === 'resolve-template' && input.config.slug !== 'fitment') {
          return false;
        }
        return true;
      }),
    };
  }

  const ready =
    input.config.directTool !== undefined &&
    input.config.requiredInputs.every((key) => inputPresent(input.entities, key));
  if (ready && input.config.directTool !== undefined) {
    return {
      kind: 'tool',
      tool: input.config.directTool,
      tools: input.config.allowedTools,
    };
  }

  if (input.config.fallbackWorkflow !== undefined) {
    return { kind: 'workflow', workflow: input.config.fallbackWorkflow };
  }

  return { kind: 'clarify' };
}
