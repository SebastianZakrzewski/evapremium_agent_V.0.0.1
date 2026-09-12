import { intentProfileFor } from './profiles';
import type { ShopIntent } from './schema';

export function acceptIntentTransition(
  from: ShopIntent | undefined,
  to: ShopIntent,
): ShopIntent {
  if (from === undefined) {
    return intentProfileFor(to) === undefined ? 'out_of_scope' : to;
  }
  if (from === to) {
    return from;
  }
  const current = intentProfileFor(from);
  if (current === undefined) {
    return to;
  }
  const routing = current.routing;
  if (routing === undefined || routing.allowIntentSwitch === false) {
    return from;
  }
  if (routing.allowedTransitions.includes(to)) {
    return to;
  }
  return from;
}
