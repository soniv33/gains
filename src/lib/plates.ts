import type { Units } from '@/types'
import { toDisplay } from './units'

export interface PlateStack {
  /** Plate denomination in lb, and how many go on each side. */
  plate: number
  count: number
}

export interface PlateSolution {
  perSide: PlateStack[]
  /** What the bar actually weighs once loaded. */
  achievedLb: number
  /** False when the target cannot be made from the available plates. */
  exact: boolean
  /** True when the target is lighter than the bar itself. */
  belowBar: boolean
}

/**
 * Weights are canonically pounds, but a kg lifter's plates convert to irrational
 * pound values, so exact arithmetic is impossible and a fixed decimal grain gets
 * it wrong. We compare with a tolerance instead: 1e-4 lb is under a tenth of a
 * gram, far finer than any real plate and far coarser than float error.
 */
const EPS = 1e-4

/**
 * Greedy descending, which is optimal for real plate sets because each
 * denomination divides evenly into the larger ones. Plates are assumed available
 * in unlimited pairs, as in any commercial gym.
 */
export function solvePlates(
  targetLb: number,
  barLb: number,
  platesLb: number[],
): PlateSolution {
  if (targetLb < barLb - EPS) {
    return { perSide: [], achievedLb: barLb, exact: false, belowBar: true }
  }
  if (targetLb <= barLb + EPS) {
    return { perSide: [], achievedLb: barLb, exact: true, belowBar: false }
  }

  let remaining = (targetLb - barLb) / 2
  const sorted = [...new Set(platesLb)].filter((p) => p > 0).sort((a, b) => b - a)
  const perSide: PlateStack[] = []

  for (const plate of sorted) {
    const count = Math.floor((remaining + EPS) / plate)
    if (count > 0) {
      perSide.push({ plate, count })
      remaining -= count * plate
    }
  }

  const achievedLb = barLb + perSide.reduce((sum, s) => sum + s.plate * s.count * 2, 0)

  return {
    perSide,
    achievedLb,
    exact: Math.abs(achievedLb - targetLb) < 2 * EPS,
    belowBar: false,
  }
}

/** The closest weight you can actually load at or below the target. */
export function nearestLoadableLb(
  targetLb: number,
  barLb: number,
  platesLb: number[],
): number {
  const solution = solvePlates(targetLb, barLb, platesLb)
  return solution.belowBar ? barLb : solution.achievedLb
}

/** "45 · 25 · 10" — what to grab, heaviest first, per side. */
export function describeStack(solution: PlateSolution, units: Units): string {
  if (solution.belowBar) return 'below bar'
  if (!solution.perSide.length) return 'empty bar'
  return solution.perSide
    .flatMap(({ plate, count }) =>
      Array<number>(count).fill(Math.round(toDisplay(plate, units) * 10) / 10),
    )
    .join(' · ')
}
