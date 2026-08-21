import type { Exercise, PlannedSet } from '@/types'
import { nearestLoadableLb } from './plates'

interface WarmupOpts {
  barLb: number
  platesLb: number[]
}

/**
 * A ramp to the working weight. Warmups are logged with kind:'warmup' so they
 * never enter volume totals or PR math — a 40% single should not become a record.
 */
export function buildWarmup(
  exercise: Exercise,
  workingLb: number,
  { barLb, platesLb }: WarmupOpts,
): PlannedSet[] {
  if (!(workingLb > 0)) return []

  const sets: PlannedSet[] = []
  const add = (weight: number, reps: number) =>
    sets.push({ weight, reps, kind: 'warmup', source: 'warmup' })

  if (exercise.usesBar) {
    // Not worth ramping something barely heavier than the empty bar.
    if (workingLb <= barLb * 1.25) return []
    add(barLb, 8)
    for (const [pct, reps] of [
      [0.45, 5],
      [0.65, 3],
      [0.85, 2],
    ] as const) {
      const w = nearestLoadableLb(workingLb * pct, barLb, platesLb)
      const prev = sets[sets.length - 1]
      // Skip a rung that lands on the same loadable weight as the one before it.
      if (w > prev.weight!) add(w, reps)
    }
  } else {
    if (workingLb < 20) return []
    for (const [pct, reps] of [
      [0.5, 8],
      [0.75, 4],
    ] as const) {
      const w = Math.round(workingLb * pct * 2) / 2
      const prev = sets[sets.length - 1]
      if (!prev || w > prev.weight!) add(w, reps)
    }
  }

  return sets
}
