import type { Muscle } from '@/types'

export interface MuscleGroup {
  id: Muscle
  label: string
  side: 'front' | 'back'
}

/** Ordered head-to-toe, which is how the body map reads. */
export const MUSCLES: MuscleGroup[] = [
  { id: 'neck', label: 'Neck', side: 'front' },
  { id: 'traps', label: 'Traps', side: 'back' },
  { id: 'shoulders', label: 'Shoulders', side: 'front' },
  { id: 'chest', label: 'Chest', side: 'front' },
  { id: 'lats', label: 'Lats', side: 'back' },
  { id: 'upper back', label: 'Upper back', side: 'back' },
  { id: 'lower back', label: 'Lower back', side: 'back' },
  { id: 'biceps', label: 'Biceps', side: 'front' },
  { id: 'triceps', label: 'Triceps', side: 'back' },
  { id: 'forearms', label: 'Forearms', side: 'front' },
  { id: 'abs', label: 'Abs', side: 'front' },
  { id: 'obliques', label: 'Obliques', side: 'front' },
  { id: 'glutes', label: 'Glutes', side: 'back' },
  { id: 'quads', label: 'Quads', side: 'front' },
  { id: 'hamstrings', label: 'Hamstrings', side: 'back' },
  { id: 'adductors', label: 'Adductors', side: 'front' },
  { id: 'abductors', label: 'Abductors', side: 'back' },
  { id: 'calves', label: 'Calves', side: 'back' },
]

export const MUSCLE_LABEL: Record<Muscle, string> = Object.fromEntries(
  MUSCLES.map((m) => [m.id, m.label]),
) as Record<Muscle, string>

/** Coarse buckets for the weekly volume readout. */
export const MUSCLE_REGION: Record<Muscle, 'push' | 'pull' | 'legs' | 'core'> = {
  chest: 'push',
  shoulders: 'push',
  triceps: 'push',
  lats: 'pull',
  'upper back': 'pull',
  traps: 'pull',
  biceps: 'pull',
  forearms: 'pull',
  neck: 'pull',
  'lower back': 'legs',
  glutes: 'legs',
  quads: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  abs: 'core',
  obliques: 'core',
}
