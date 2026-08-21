import { describe, expect, it } from 'vitest'
import { formatWeight, fromDisplay, snapLb, stepLb, toDisplay } from './units'

describe('units', () => {
  it('round-trips without drift, which is what keeps a kg user honest over years', () => {
    for (const kg of [2.5, 20, 60, 62.5, 100, 142.5]) {
      const lb = fromDisplay(kg, 'kg')
      expect(toDisplay(lb, 'kg')).toBeCloseTo(kg, 10)
    }
  })

  it('leaves pounds untouched', () => {
    expect(toDisplay(135, 'lb')).toBe(135)
    expect(fromDisplay(135, 'lb')).toBe(135)
  })

  it('formats without trailing zeros', () => {
    expect(formatWeight(135, 'lb')).toBe('135')
    expect(formatWeight(fromDisplay(62.5, 'kg'), 'kg')).toBe('62.5')
  })

  it('steps by 5 lb or 2.5 kg, with a finer step for small jumps', () => {
    expect(stepLb('lb')).toBe(5)
    expect(stepLb('lb', true)).toBe(2.5)
    expect(toDisplay(stepLb('kg'), 'kg')).toBeCloseTo(2.5, 10)
    expect(toDisplay(stepLb('kg', true), 'kg')).toBeCloseTo(1.25, 10)
  })

  it('snaps to a clean number in the display unit', () => {
    expect(snapLb(135.3, 'lb')).toBe(135.5)
    expect(toDisplay(snapLb(fromDisplay(62.6, 'kg'), 'kg'), 'kg')).toBeCloseTo(62.5, 6)
  })
})
