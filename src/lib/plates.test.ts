import { describe, expect, it } from 'vitest'
import { describeStack, nearestLoadableLb, solvePlates } from './plates'
import { DEFAULT_PLATES_LB, DEFAULT_PLATES_KG_AS_LB, fromDisplay } from './units'

const BAR = 45
const PLATES = DEFAULT_PLATES_LB

describe('solvePlates', () => {
  it('solves the canonical loads a lifter actually asks about', () => {
    expect(solvePlates(135, BAR, PLATES).perSide).toEqual([{ plate: 45, count: 1 }])
    expect(solvePlates(225, BAR, PLATES).perSide).toEqual([{ plate: 45, count: 2 }])
    expect(solvePlates(315, BAR, PLATES).perSide).toEqual([{ plate: 45, count: 3 }])
  })

  it('mixes denominations heaviest-first', () => {
    const s = solvePlates(185, BAR, PLATES)
    expect(s.perSide).toEqual([
      { plate: 45, count: 1 },
      { plate: 25, count: 1 },
    ])
    expect(s.achievedLb).toBe(185)
    expect(s.exact).toBe(true)
  })

  it('reports the empty bar rather than pretending', () => {
    const s = solvePlates(45, BAR, PLATES)
    expect(s.perSide).toEqual([])
    expect(s.exact).toBe(true)
    expect(describeStack(s, 'lb')).toBe('empty bar')
  })

  it('flags a target below the bar instead of returning nonsense', () => {
    const s = solvePlates(30, BAR, PLATES)
    expect(s.belowBar).toBe(true)
    expect(describeStack(s, 'lb')).toBe('below bar')
  })

  it('marks an unreachable weight inexact and rounds down to what loads', () => {
    const s = solvePlates(133, BAR, PLATES)
    expect(s.exact).toBe(false)
    expect(s.achievedLb).toBe(130)
    expect(nearestLoadableLb(133, BAR, PLATES)).toBe(130)
  })

  it('never drifts on floats across many 2.5 lb plates', () => {
    const s = solvePlates(70, BAR, [2.5])
    expect(s.perSide).toEqual([{ plate: 2.5, count: 5 }])
    expect(s.achievedLb).toBe(70)
    expect(s.exact).toBe(true)
  })

  it('works in kg, where every plate is an irrational number of pounds', () => {
    const bar = fromDisplay(20, 'kg')
    const target = fromDisplay(100, 'kg')
    const s = solvePlates(target, bar, DEFAULT_PLATES_KG_AS_LB)
    expect(s.exact).toBe(true)
    expect(describeStack(s, 'kg')).toBe('25 · 15')
  })

  it('renders the stack as the plates you grab, heaviest first', () => {
    expect(describeStack(solvePlates(275, BAR, PLATES), 'lb')).toBe('45 · 45 · 25')
  })
})
