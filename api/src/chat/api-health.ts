export const CD_PROBE = 'cd-probe-wait-ready';

export function apiHealth(): { status: 'ok'; probe: string } {
  return { status: 'ok', probe: CD_PROBE };
}
