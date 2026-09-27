import { FITMENT_CASCADE_WORKFLOW } from './fitment-session';
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

function hasVehicleSlot(entities: RouterEntities): boolean {
  return (
    inputPresent(entities, 'car_brand') ||
    inputPresent(entities, 'car_model') ||
    inputPresent(entities, 'year') ||
    inputPresent(entities, 'body_type')
  );
}

function inputPresent(entities: RouterEntities, key: keyof RouterEntities): boolean {
  if (key === 'year') {
    return typeof entities.year === 'number';
  }
  const value = entities[key];
  return typeof value === 'string' && value.trim() !== '';
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

  if (input.config.slug === 'fitment' && hasVehicleSlot(input.entities)) {
    return { kind: 'workflow', workflow: FITMENT_CASCADE_WORKFLOW };
  }

  if (input.mode === 'knowledge') {
    return {
      kind: 'knowledge',
      tools: input.config.allowedTools.filter(
        (tool) =>
          tool !== 'quote-price' &&
          tool !== 'quote-vehicle' &&
          tool !== 'resolve-template',
      ),
    };
  }

  const slotsReady = input.config.requiredInputs.every((key) =>
    inputPresent(input.entities, key),
  );
  const ready = input.config.directTool !== undefined && slotsReady;
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
