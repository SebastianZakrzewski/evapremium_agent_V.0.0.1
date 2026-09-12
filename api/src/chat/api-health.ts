export const CD_PROBE = 'cd-probe-20260912-1555';

export function apiHealth(): { status: 'ok'; probe: string } {
  return { status: 'ok', probe: CD_PROBE };
}
