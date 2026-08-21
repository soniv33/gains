import type { Muscle } from '@/types'
import { MUSCLE_LABEL } from '@/data/muscles'

/**
 * A schematic figure: one connected silhouette with a shape per muscle group
 * laid over it. Deliberately not an anatomical drawing — it has to stay legible
 * at 100px wide and every region has to be a comfortable tap target.
 *
 * Used three ways: to filter the library, to show what a lift trains, and to
 * shade weekly volume so undertrained areas surface without going looking.
 */

interface Props {
  /** 0–1 per muscle. Anything above 0 is tinted; 1 is full accent. */
  intensity?: Partial<Record<Muscle, number>>
  onSelect?: (muscle: Muscle) => void
  size?: number
  only?: 'front' | 'back'
}

type Shape = { m: Muscle; d?: string; e?: [number, number, number, number] }

const mirrorPath = (d: string) =>
  d.replace(/(-?\d+(?:\.\d+)?)( \d+(?:\.\d+)?)/g, (_, x: string, rest: string) =>
    `${100 - Number(x)}${rest}`,
  )

/**
 * The body itself. Drawn first, and every part overlaps its neighbour so the
 * figure reads as one person rather than a pile of parts.
 */
const SILHOUETTE = [
  'M50 2a9 11 0 0 1 0 22a9 11 0 0 1 0-22Z',
  'M46 21h8v10h-8Z',
  'M36 31 64 31 62 66 61 92Q50 97 39 92L38 66Z',
  'M35 34 41 36 34 70 27 68Z',
  'M65 34 59 36 66 70 73 68Z',
  'M27 68 34 70 31 102 24 100Z',
  'M73 68 66 70 69 102 76 100Z',
  'M21 98h9v12a4.5 4.5 0 0 1-9 0Z',
  'M70 98h9v12a4.5 4.5 0 0 1-9 0Z',
  'M39 89 48 89 47 142 37 142Z',
  'M61 89 52 89 53 142 63 142Z',
  'M38 140 47 140 45 182 38 182Z',
  'M62 140 53 140 55 182 62 182Z',
  'M35 180h13v9a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3Z',
  'M52 180h13v9a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3Z',
]

const FRONT_L: Shape[] = [
  { m: 'shoulders', e: [37, 38, 6.5, 6.5] },
  { m: 'chest', d: 'M39 35Q45 32 49 36L49 52Q42 53 39 45Z' },
  { m: 'biceps', e: [34, 53, 5.5, 12] },
  { m: 'forearms', e: [29, 85, 5, 14] },
  { m: 'obliques', d: 'M39 54 44 54 44 84 40 76Z' },
  { m: 'quads', d: 'M40 92 47 92 46 138 39 138Z' },
  { m: 'adductors', d: 'M48 93 50 93 50 124 47 122Z' },
  { m: 'calves', e: [42, 158, 5, 14] },
]

const FRONT_CENTRE: Shape[] = [
  { m: 'neck', d: 'M46 22h8v9h-8Z' },
  { m: 'abs', d: 'M45 54h10v30h-10Z' },
]

const BACK_L: Shape[] = [
  { m: 'shoulders', e: [37, 38, 6.5, 6.5] },
  { m: 'upper back', d: 'M39 39 45 42 45 56 38 53Z' },
  { m: 'lats', d: 'M38 53 45 51 45 76 40 72Z' },
  { m: 'triceps', e: [34, 53, 5.5, 12] },
  { m: 'forearms', e: [29, 85, 5, 14] },
  { m: 'abductors', d: 'M35 84 40 86 39 99 34 94Z' },
  { m: 'glutes', d: 'M39 84Q45 81 50 86L50 99Q42 101 39 94Z' },
  { m: 'hamstrings', d: 'M40 100 47 100 46 138 39 138Z' },
  { m: 'calves', e: [42, 158, 5, 14] },
]

const BACK_CENTRE: Shape[] = [
  { m: 'traps', d: 'M40 29 60 29 55 50 45 50Z' },
  { m: 'lower back', d: 'M45 57h10v27h-10Z' },
]

function expand(left: Shape[], centre: Shape[]): Shape[] {
  const right = left.map((s) => ({
    m: s.m,
    d: s.d ? mirrorPath(s.d) : undefined,
    e: s.e ? ([100 - s.e[0], s.e[1], s.e[2], s.e[3]] as [number, number, number, number]) : undefined,
  }))
  return [...centre, ...left, ...right]
}

const FRONT = expand(FRONT_L, FRONT_CENTRE)
const BACK = expand(BACK_L, BACK_CENTRE)

function Figure({
  shapes,
  label,
  intensity,
  onSelect,
}: {
  shapes: Shape[]
  label: string
  intensity: Partial<Record<Muscle, number>>
  onSelect?: (m: Muscle) => void
}) {
  return (
    <svg viewBox="0 0 100 200" className="bodymap" role="img" aria-label={`${label} view`}>
      <g className="bm-body">
        {SILHOUETTE.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {shapes.map((shape, index) => {
        const value = intensity[shape.m] ?? 0
        const interactive = Boolean(onSelect)
        return (
          <g
            key={`${shape.m}-${index}`}
            className="bm-muscle"
            data-muscle={shape.m}
            data-on={value > 0 ? 'true' : 'false'}
            style={value > 0 ? { opacity: 0.4 + value * 0.6 } : undefined}
            onClick={interactive ? () => onSelect?.(shape.m) : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? MUSCLE_LABEL[shape.m] : undefined}
            aria-pressed={interactive ? value > 0 : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect?.(shape.m)
                    }
                  }
                : undefined
            }
          >
            {shape.d ? <path d={shape.d} /> : null}
            {shape.e ? <ellipse cx={shape.e[0]} cy={shape.e[1]} rx={shape.e[2]} ry={shape.e[3]} /> : null}
          </g>
        )
      })}
    </svg>
  )
}

export function BodyMap({ intensity = {}, onSelect, size = 150, only }: Props) {
  return (
    <div className="bodymap-wrap" style={{ ['--bm-size' as string]: `${size}px` }}>
      {only !== 'back' && (
        <Figure shapes={FRONT} label="Front" intensity={intensity} onSelect={onSelect} />
      )}
      {only !== 'front' && (
        <Figure shapes={BACK} label="Back" intensity={intensity} onSelect={onSelect} />
      )}
    </div>
  )
}

/** Primary muscles read solid, secondary at a glance-level tint. */
export function emphasis(
  primary: Muscle[],
  secondary: Muscle[],
): Partial<Record<Muscle, number>> {
  const map: Partial<Record<Muscle, number>> = {}
  for (const m of secondary) map[m] = 0.4
  for (const m of primary) map[m] = 1
  return map
}
