import type { DistanceUnit } from '@/contexts/settings-context';

/** Formats a distance stored in km for display in the user's chosen unit. */
export function formatDistance(km: number, unit: DistanceUnit, withAway = true) {
  const value = unit === 'mi' ? km * 0.621371 : km;
  return `${value.toFixed(1)} ${unit}${withAway ? ' away' : ''}`;
}

export function roundDistance(km: number, unit: DistanceUnit) {
  return Math.round(unit === 'mi' ? km * 0.621371 : km);
}
