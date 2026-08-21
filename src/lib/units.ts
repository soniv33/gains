import type { Units } from '@/types'

/**
 * Weights are stored canonically in pounds and converted only at the display
 * boundary. Conversion is lossless float in both directions, so a kg user's
 * entered value round-trips without drifting a gram per session.
 */
export const LB_PER_KG = 2.2046226218487757
export const KG_PER_LB = 0.45359237

export function toDisplay(lb: number, units: Units): number {
  return units === 'kg' ? lb * KG_PER_LB : lb
}

export function fromDisplay(value: number, units: Units): number {
  return units === 'kg' ? value * LB_PER_KG : value
}

/**
 * Trims trailing zeros so 135 reads "135" and 62.5 reads "62.5". Two decimals by
 * default because a 1.25 kg plate is a real plate, and rounding it to 1.3 is wrong.
 */
export function formatWeight(lb: number, units: Units, decimals = 2): string {
  const v = toDisplay(lb, units)
  const rounded = Math.round(v * 10 ** decimals) / 10 ** decimals
  return String(rounded)
}

export function formatWeightWithUnit(lb: number, units: Units): string {
  return `${formatWeight(lb, units)} ${units}`
}

/** Coarse step for the ± buttons, and the fine step for a long-press. */
export function stepLb(units: Units, fine = false): number {
  if (units === 'kg') return fromDisplay(fine ? 1.25 : 2.5, 'kg')
  return fine ? 2.5 : 5
}

/** Snaps to the nearest sensible increment in the *display* unit. */
export function snapLb(lb: number, units: Units): number {
  const grain = units === 'kg' ? 0.25 : 0.5
  const disp = toDisplay(lb, units)
  return fromDisplay(Math.round(disp / grain) * grain, units)
}

export const DEFAULT_BAR_LB = 45
export const DEFAULT_BAR_KG_AS_LB = fromDisplay(20, 'kg')

export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5]
export const DEFAULT_PLATES_KG_AS_LB = [25, 20, 15, 10, 5, 2.5, 1.25].map((k) =>
  fromDisplay(k, 'kg'),
)
