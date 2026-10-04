export const TURN_BUDGET_MESSAGE =
  'W tej rozmowie wykorzystano limit zapytań. Napisz do nas przez formularz sklepu.';

export class TurnBudgetExceededError extends Error {
  readonly error = 'turn_budget_exceeded' as const;

  constructor() {
    super('turn_budget_exceeded');
    this.name = 'TurnBudgetExceededError';
  }
}

export async function throwIfTurnBudget(response: Response): Promise<void> {
  if (response.status !== 429) {
    return;
  }
  let body: { error?: string };
  try {
    body = (await response.json()) as { error?: string };
  } catch {
    return;
  }
  if (body.error === 'turn_budget_exceeded') {
    throw new TurnBudgetExceededError();
  }
}
