import type { Muscle } from '@/types'
import { MUSCLE_LABEL } from '@/data/muscles'

/**
 * A schematic figure assembled from one shape per muscle group. Deliberately not
 * an anatomical drawing: it has to stay legible at 120px wide and every region
 * has to be a comfortable tap target.
 *
 * Used three ways — to filter the library, to show what a lift trains, and to
 * shade weekly volume so undertrained areas surface without you going looking.
 */

interface Props {
  /** 0–1 per muscle. Anything above 0 is tinted; 1 is full accent. */
  intensity?: Partial<Record<Muscle, number>>
  onSelect?: (muscle: Muscle) => void
  size?: number
  /** Hide the front or back half when space is tight. */
  only?: 'front' | 'back'
}

type Shape = { m: Muscle; el: JSX.Element }

const mirror = (x: number) => 100 - x

/** Head, hands, feet and joints: silhouette filler, never interactive. */
const Filler = () => (
  <g className="bm-filler">
    <ellipse cx="50" cy="14" rx="10" ry="12" />
    <rect x="12" y="110" width="12" height="14" rx="6" />
    <rect x="76" y="110" width="12" height="14" rx="6" />
    <rect x="38" y="148" width="10" height="6" rx="3" />
    <rect x="52" y="148" width="10" height="6" rx="3" />
    <rect x="38" y="186" width="11" height="8" rx="3" />
    <rect x="51" y="186" width="11" height="8" rx="3" />
  </g>
)

const FRONT: Shape[] = [
  { m: 'neck', el: <rect x="44" y="24" width="12" height="9" rx="3" /> },
  { m: 'shoulders', el: <ellipse cx="28" cy="45" rx="12" ry="10" /> },
  { m: 'shoulders', el: <ellipse cx={mirror(28)} cy="45" rx="12" ry="10" /> },
  { m: 'chest', el: <path d="M39 37 Q45 33 49 37 L49 55 Q42 56 39 48 Z" /> },
  { m: 'chest', el: <path d="M61 37 Q55 33 51 37 L51 55 Q58 56 61 48 Z" /> },
  { m: 'abs', el: <rect x="43" y="58" width="14" height="30" rx="4" /> },
  { m: 'obliques', el: <path d="M38 58 L42 58 L42 88 L38 78 Z" /> },
  { m: 'obliques', el: <path d="M62 58 L58 58 L58 88 L62 78 Z" /> },
  { m: 'biceps', el: <ellipse cx="22" cy="66" rx="7" ry="15" /> },
  { m: 'biceps', el: <ellipse cx={mirror(22)} cy="66" rx="7" ry="15" /> },
  { m: 'forearms', el: <ellipse cx="18" cy="95" rx="6" ry="16" /> },
  { m: 'forearms', el: <ellipse cx={mirror(18)} cy="95" rx="6" ry="16" /> },
  { m: 'quads', el: <path d="M38 94 L47 94 L46 146 L37 146 Z" /> },
  { m: 'quads', el: <path d="M62 94 L53 94 L54 146 L63 146 Z" /> },
  { m: 'adductors', el: <path d="M48 96 L50 96 L50 130 L47 128 Z" /> },
  { m: 'adductors', el: <path d="M52 96 L50 96 L50 130 L53 128 Z" /> },
  { m: 'calves', el: <ellipse cx="42" cy="168" rx="6" ry="17" /> },
  { m: 'calves', el: <ellipse cx={mirror(42)} cy="168" rx="6" ry="17" /> },
]

const BACK: Shape[] = [
  { m: 'traps', el: <path d="M38 28 L62 28 L56 52 L44 52 Z" /> },
  { m: 'shoulders', el: <ellipse cx="28" cy="45" rx="12" ry="10" /> },
  { m: 'shoulders', el: <ellipse cx={mirror(28)} cy="45" rx="12" ry="10" /> },
  { m: 'upper back', el: <path d="M38 40 L44 44 L44 60 L37 56 Z" /> },
  { m: 'upper back', el: <path d="M62 40 L56 44 L56 60 L63 56 Z" /> },
  { m: 'lats', el: <path d="M37 56 L45 54 L45 76 L39 72 Z" /> },
  { m: 'lats', el: <path d="M63 56 L55 54 L55 76 L61 72 Z" /> },
  { m: 'lower back', el: <rect x="44" y="62" width="12" height="26" rx="4" /> },
  { m: 'triceps', el: <ellipse cx="22" cy="66" rx="7" ry="15" /> },
  { m: 'triceps', el: <ellipse cx={mirror(22)} cy="66" rx="7" ry="15" /> },
  { m: 'forearms', el: <ellipse cx="18" cy="95" rx="6" ry="16" /> },
  { m: 'forearms', el: <ellipse cx={mirror(18)} cy="95" rx="6" ry="16" /> },
  { m: 'glutes', el: <path d="M38 90 Q44 86 49 92 L49 106 Q41 108 38 100 Z" /> },
  { m: 'glutes', el: <path d="M62 90 Q56 86 51 92 L51 106 Q59 108 62 100 Z" /> },
  { m: 'abductors', el: <path d="M35 88 L39 90 L38 104 L34 98 Z" /> },
  { m: 'abductors', el: <path d="M65 88 L61 90 L62 104 L66 98 Z" /> },
  { m: 'hamstrings', el: <path d="M38 108 L47 108 L46 146 L37 146 Z" /> },
  { m: 'hamstrings', el: <path d="M62 108 L53 108 L54 146 L63 146 Z" /> },
  { m: 'calves', el: <ellipse cx="42" cy="168" rx="6" ry="17" /> },
  { m: 'calves', el: <ellipse cx={mirror(42)} cy="168" rx="6" ry="17" /> },
]

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
      <Filler />
      {shapes.map((shape, index) => {
        const value = intensity[shape.m] ?? 0
        const interactive = Boolean(onSelect)
        return (
          <g
            key={`${shape.m}-${index}`}
            className="bm-muscle"
            data-muscle={shape.m}
            data-on={value > 0 ? 'true' : 'false'}
            style={{ opacity: value > 0 ? 0.35 + value * 0.65 : 1 }}
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
            {shape.el}
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
  for (const m of secondary) map[m] = 0.45
  for (const m of primary) map[m] = 1
  return map
}
