import type { Routine, RoutineDay } from '@/types'
import { ulid } from '@/db/ulid'
import { getExercise } from './exercises'

interface TemplateItem {
  id: string
  sets: number
  min: number
  max: number
  /** Items sharing a label are alternated as a superset. */
  superset?: string
}

interface TemplateDay {
  name: string
  items: TemplateItem[]
}

export interface Template {
  key: string
  name: string
  description: string
  frequency: string
  days: TemplateDay[]
}

const i = (id: string, sets: number, min: number, max: number, superset?: string): TemplateItem => ({
  id,
  sets,
  min,
  max,
  ...(superset ? { superset } : {}),
})

export const TEMPLATES: Template[] = [
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    description:
      'The default for a reason. Each muscle gets hit hard once per rotation with a clean division of labour, so nothing is sore when you need it.',
    frequency: 'Run it 3 days a week, or twice through for 6.',
    days: [
      {
        name: 'Push',
        items: [
          i('barbell-bench-press-medium-grip', 4, 5, 8),
          i('dumbbell-shoulder-press', 3, 8, 12),
          i('incline-dumbbell-press', 3, 8, 12),
          i('side-lateral-raise', 3, 12, 15),
          i('triceps-pushdown', 3, 10, 15),
          i('cable-rope-overhead-triceps-extension', 3, 10, 15),
        ],
      },
      {
        name: 'Pull',
        items: [
          i('barbell-deadlift', 3, 4, 6),
          i('wide-grip-lat-pulldown', 4, 8, 12),
          i('bent-over-barbell-row', 4, 6, 10),
          i('seated-cable-rows', 3, 10, 12),
          i('face-pull', 3, 12, 20),
          i('barbell-curl', 3, 8, 12),
          i('hammer-curls', 3, 10, 15),
        ],
      },
      {
        name: 'Legs',
        items: [
          i('barbell-squat', 4, 5, 8),
          i('romanian-deadlift', 3, 8, 10),
          i('leg-press', 3, 10, 12),
          i('lying-leg-curls', 3, 10, 15),
          i('standing-calf-raises', 4, 12, 15),
          i('hanging-leg-raise', 3, 10, 20),
        ],
      },
    ],
  },
  {
    key: 'upper-lower',
    name: 'Upper / Lower',
    description:
      'Four days, two rotations of each half. Hits everything twice a week, which is where most of the evidence on growth points.',
    frequency: '4 days a week.',
    days: [
      {
        name: 'Upper A',
        items: [
          i('barbell-bench-press-medium-grip', 4, 5, 8),
          i('bent-over-barbell-row', 4, 6, 10),
          i('dumbbell-shoulder-press', 3, 8, 12),
          i('wide-grip-lat-pulldown', 3, 10, 12),
          i('side-lateral-raise', 3, 12, 15),
          i('barbell-curl', 3, 8, 12),
          i('triceps-pushdown', 3, 10, 15),
        ],
      },
      {
        name: 'Lower A',
        items: [
          i('barbell-squat', 4, 5, 8),
          i('romanian-deadlift', 3, 8, 10),
          i('leg-press', 3, 10, 12),
          i('lying-leg-curls', 3, 10, 15),
          i('standing-calf-raises', 4, 12, 15),
        ],
      },
      {
        name: 'Upper B',
        items: [
          i('incline-dumbbell-press', 4, 8, 10),
          i('pullups', 4, 6, 10),
          i('seated-barbell-military-press', 3, 6, 10),
          i('seated-cable-rows', 3, 10, 12),
          i('dumbbell-flyes', 3, 10, 15),
          i('close-grip-barbell-bench-press', 3, 8, 12),
          i('hammer-curls', 3, 10, 15),
        ],
      },
      {
        name: 'Lower B',
        items: [
          i('barbell-deadlift', 3, 4, 6),
          i('front-barbell-squat', 3, 6, 8),
          i('barbell-lunge', 3, 8, 12),
          i('seated-leg-curl', 3, 10, 15),
          i('calf-press', 4, 12, 15),
        ],
      },
    ],
  },
  {
    key: 'full-body',
    name: 'Full Body',
    description:
      'Three sessions, everything trained in each. The most forgiving split there is — miss a day and you have not missed a muscle.',
    frequency: '3 days a week, ideally with a rest day between.',
    days: [
      {
        name: 'Full Body A',
        items: [
          i('barbell-squat', 3, 5, 8),
          i('barbell-bench-press-medium-grip', 3, 5, 8),
          i('bent-over-barbell-row', 3, 6, 10),
          i('dumbbell-shoulder-press', 2, 8, 12),
          i('plank', 3, 1, 1),
        ],
      },
      {
        name: 'Full Body B',
        items: [
          i('barbell-deadlift', 3, 4, 6),
          i('dumbbell-bench-press', 3, 8, 12),
          i('wide-grip-lat-pulldown', 3, 8, 12),
          i('barbell-lunge', 2, 8, 12),
          i('hanging-leg-raise', 3, 10, 20),
        ],
      },
      {
        name: 'Full Body C',
        items: [
          i('front-barbell-squat', 3, 6, 8),
          i('standing-military-press', 3, 6, 10),
          i('one-arm-dumbbell-row', 3, 8, 12),
          i('romanian-deadlift', 3, 8, 10),
          i('side-lateral-raise', 2, 12, 15),
        ],
      },
    ],
  },
  {
    key: 'arnold',
    name: 'Arnold Split',
    description:
      'Antagonist pairing — chest with back, biceps with triceps. High volume, and the supersets mean you are resting one muscle while working the other.',
    frequency: '3 days a week, or 6 for the full classic.',
    days: [
      {
        name: 'Chest & Back',
        items: [
          i('barbell-bench-press-medium-grip', 4, 6, 10, 'a'),
          i('wide-grip-lat-pulldown', 4, 8, 12, 'a'),
          i('incline-dumbbell-press', 3, 8, 12, 'b'),
          i('bent-over-barbell-row', 3, 8, 12, 'b'),
          i('dumbbell-flyes', 3, 10, 15),
          i('straight-arm-pulldown', 3, 12, 15),
        ],
      },
      {
        name: 'Shoulders & Arms',
        items: [
          i('seated-barbell-military-press', 4, 6, 10),
          i('side-lateral-raise', 4, 12, 15),
          i('barbell-curl', 3, 8, 12, 'c'),
          i('close-grip-barbell-bench-press', 3, 8, 12, 'c'),
          i('hammer-curls', 3, 10, 15, 'd'),
          i('triceps-pushdown', 3, 10, 15, 'd'),
        ],
      },
      {
        name: 'Legs',
        items: [
          i('barbell-squat', 4, 6, 10),
          i('leg-extensions', 3, 12, 15),
          i('lying-leg-curls', 3, 12, 15),
          i('romanian-deadlift', 3, 8, 10),
          i('standing-calf-raises', 4, 15, 20),
        ],
      },
    ],
  },
]

/** Turns a template into a real, editable routine of your own. */
export function materialize(template: Template, now = Date.now()): Routine {
  const days: RoutineDay[] = template.days.map((day) => ({
    id: ulid(now),
    name: day.name,
    items: day.items.map((item) => ({
      exerciseId: item.id,
      sets: item.sets,
      repRange: { min: item.min, max: item.max },
      restSec: getExercise(item.id)?.defaultRestSec ?? 120,
      ...(item.superset ? { supersetGroup: item.superset } : {}),
    })),
  }))

  return {
    id: ulid(now),
    updatedAt: now,
    name: template.name,
    source: 'template',
    templateKey: template.key,
    description: template.description,
    days,
  }
}

/** Every exercise a template references must exist, or the routine is broken. */
export function missingTemplateExercises(): string[] {
  return TEMPLATES.flatMap((t) =>
    t.days.flatMap((d) => d.items.map((it) => it.id).filter((id) => !getExercise(id))),
  )
}
