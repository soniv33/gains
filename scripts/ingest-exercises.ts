/**
 * Vendors github.com/yuhonas/free-exercise-db (Unlicense / public domain) into
 * the app: normalises 873 exercises onto our own enums and transcodes both
 * demo frames to WebP under public/ex/.
 *
 * The output is committed. That is deliberate — an app you open in a basement
 * gym cannot depend on an API being reachable, rate limits, or a key.
 *
 *   npm run ingest            # everything
 *   npm run ingest -- --limit 20   # a quick subset while iterating
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { Equipment, Exercise, Level, Mechanic, Muscle, Pattern, RepRange } from '../src/types'

const DATA_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

const OUT_DIR = path.resolve('public/ex')
const OUT_TS = path.resolve('src/data/exercises.generated.ts')
const OUT_INSTRUCTIONS = path.resolve('src/data/instructions.generated.ts')
const CACHE = path.resolve('node_modules/.cache/free-exercise-db.json')

const FRAME_WIDTH = 420
const FRAME_QUALITY = 68
const CONCURRENCY = 12

const KEEP_CATEGORIES = new Set([
  'strength',
  'powerlifting',
  'olympic weightlifting',
  'strongman',
  'plyometrics',
])

interface Upstream {
  id: string
  name: string
  force: string | null
  level: Level
  mechanic: 'compound' | 'isolation' | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

const MUSCLE_MAP: Record<string, Muscle> = {
  abdominals: 'abs',
  abductors: 'abductors',
  adductors: 'adductors',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'lats',
  'lower back': 'lower back',
  'middle back': 'upper back',
  neck: 'neck',
  quadriceps: 'quads',
  shoulders: 'shoulders',
  traps: 'traps',
  triceps: 'triceps',
}

const EQUIPMENT_MAP: Record<string, Equipment> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  kettlebells: 'kettlebell',
  bands: 'bands',
  'e-z curl bar': 'ez bar',
  'body only': 'bodyweight',
  'exercise ball': 'bodyweight',
  'foam roll': 'other',
  'medicine ball': 'other',
  other: 'other',
}

const LOWER_MUSCLES = new Set<Muscle>([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
  'lower back',
])

/** Ordered: the first phrase that matches a name wins. */
const PATTERN_RULES: [RegExp, Pattern][] = [
  [/\b(farmer|carry|suitcase|yoke|waiter)/i, 'carry'],
  [/\b(lunge|split squat|step[- ]?up|bulgarian)/i, 'lunge'],
  [/\b(squat|leg press|hack)/i, 'squat'],
  [/\b(deadlift|good ?morning|romanian|rdl|hip thrust|swing|clean|snatch|back extension|hyperextension|pull[- ]?through)/i, 'hinge'],
  [/\b(pull[- ]?up|chin[- ]?up|pulldown|pull[- ]?down|lat pull)/i, 'vertical pull'],
  [/\b(row|face pull|rear delt|shrug)/i, 'horizontal pull'],
  [/\b(overhead press|shoulder press|military|push press|handstand|arnold press|jerk)/i, 'vertical push'],
  [/\b(bench|push[- ]?up|chest press|dip|floor press)/i, 'horizontal push'],
  [/\b(crunch|sit[- ]?up|plank|leg raise|russian twist|ab |woodchop|hollow)/i, 'core'],
]

const UNILATERAL = /\b(one[- ]arm|single[- ]arm|one[- ]leg|single[- ]leg|alternating|unilateral|bulgarian|pistol|suitcase)\b/i

function classify(name: string, primary: Muscle[], mechanic: Mechanic): Pattern {
  for (const [re, pattern] of PATTERN_RULES) if (re.test(name)) return pattern
  if (primary.includes('abs') || primary.includes('obliques')) return 'core'
  if (mechanic === 'isolation') return 'isolation'
  if (primary.some((m) => LOWER_MUSCLES.has(m))) return 'squat'
  return 'isolation'
}

/**
 * Heavy compounds get low reps and long rest; isolation gets the opposite.
 * These are only defaults — every routine item can override both.
 */
function prescription(pattern: Pattern, mechanic: Mechanic): {
  repRange: RepRange
  restSec: number
} {
  if (mechanic === 'isolation' && pattern !== 'core') {
    return { repRange: { min: 10, max: 15 }, restSec: 60 }
  }
  switch (pattern) {
    case 'squat':
    case 'hinge':
      return { repRange: { min: 5, max: 8 }, restSec: 180 }
    case 'horizontal push':
    case 'vertical push':
      return { repRange: { min: 6, max: 10 }, restSec: 150 }
    case 'horizontal pull':
    case 'vertical pull':
      return { repRange: { min: 6, max: 12 }, restSec: 120 }
    case 'lunge':
      return { repRange: { min: 8, max: 12 }, restSec: 120 }
    case 'carry':
      return { repRange: { min: 1, max: 1 }, restSec: 120 }
    case 'core':
      return { repRange: { min: 10, max: 20 }, restSec: 45 }
    default:
      return { repRange: { min: 8, max: 12 }, restSec: 90 }
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function fetchDataset(): Promise<Upstream[]> {
  if (existsSync(CACHE)) {
    return JSON.parse(await readFile(CACHE, 'utf8'))
  }
  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`dataset fetch failed: ${res.status}`)
  const json = (await res.json()) as Upstream[]
  await mkdir(path.dirname(CACHE), { recursive: true })
  await writeFile(CACHE, JSON.stringify(json))
  return json
}

async function transcodeFrame(remote: string, dest: string): Promise<boolean> {
  if (existsSync(dest)) return true
  const res = await fetch(IMAGE_BASE + remote)
  if (!res.ok) return false
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(path.dirname(dest), { recursive: true })
  await sharp(buf)
    .resize({ width: FRAME_WIDTH, withoutEnlargement: true })
    .webp({ quality: FRAME_QUALITY })
    .toFile(dest)
  return true
}

/** Bounded parallelism; GitHub raw is happy with a dozen in flight, not 1500. */
async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++
        await fn(items[i], i)
      }
    }),
  )
}

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity

  const upstream = await fetchDataset()
  console.log(`fetched ${upstream.length} exercises`)

  const kept = upstream
    .filter((e) => KEEP_CATEGORIES.has(e.category))
    .filter((e) => e.images?.length >= 2)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit)

  console.log(`keeping ${kept.length} after filtering to trainable categories`)

  const exercises: Exercise[] = []
  const instructions: Record<string, string[]> = {}
  let framesOk = 0
  let framesFailed = 0

  await pool(kept, CONCURRENCY, async (u) => {
    const id = slug(u.name)
    const primaryMuscles = u.primaryMuscles.map((m) => MUSCLE_MAP[m]).filter(Boolean)
    const secondaryMuscles = u.secondaryMuscles.map((m) => MUSCLE_MAP[m]).filter(Boolean)
    if (!primaryMuscles.length) return

    const equipment = EQUIPMENT_MAP[u.equipment ?? 'other'] ?? 'bodyweight'
    const mechanic: Mechanic = u.mechanic ?? 'compound'
    const pattern = classify(u.name, primaryMuscles, mechanic)
    const { repRange, restSec } = prescription(pattern, mechanic)

    const [a, b] = await Promise.all([
      transcodeFrame(u.images[0], path.join(OUT_DIR, id, '0.webp')),
      transcodeFrame(u.images[1], path.join(OUT_DIR, id, '1.webp')),
    ])
    const hasFrames = a && b
    hasFrames ? framesOk++ : framesFailed++

    exercises.push({
      id,
      name: u.name,
      primaryMuscles,
      secondaryMuscles,
      equipment,
      mechanic,
      force: (u.force as Exercise['force']) ?? undefined,
      level: u.level,
      pattern,
      isLower: LOWER_MUSCLES.has(primaryMuscles[0]),
      isUnilateral: UNILATERAL.test(u.name),
      usesBar: equipment === 'barbell' || equipment === 'ez bar',
      defaultRepRange: repRange,
      defaultRestSec: restSec,
      ...(hasFrames ? { hasDemo: true as const } : {}),
    })
    instructions[id] = u.instructions ?? []
  })

  exercises.sort((a, b) => a.name.localeCompare(b.name))

  const banner = `/**
 * GENERATED by scripts/ingest-exercises.ts — do not edit by hand.
 *
 * Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain)
 * ${exercises.length} exercises, ${framesOk} with both demo frames vendored under public/ex/.
 *
 * Step-by-step instructions live in instructions.generated.ts, which is loaded
 * on demand — they are half the payload and are only read on the detail sheet.
 */
import type { Exercise } from '@/types'

export const EXERCISES: Exercise[] = ${JSON.stringify(exercises, null, 0)}

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
)
`
  await mkdir(path.dirname(OUT_TS), { recursive: true })
  await writeFile(OUT_TS, banner)

  await writeFile(
    OUT_INSTRUCTIONS,
    `/** GENERATED by scripts/ingest-exercises.ts — do not edit by hand. */
export const INSTRUCTIONS: Record<string, string[]> = ${JSON.stringify(instructions, null, 0)}
`,
  )

  console.log(`wrote ${exercises.length} exercises -> ${path.relative(process.cwd(), OUT_TS)}`)
  console.log(`frames: ${framesOk} ok, ${framesFailed} missing`)
  const patterns = exercises.reduce<Record<string, number>>((acc, e) => {
    acc[e.pattern] = (acc[e.pattern] ?? 0) + 1
    return acc
  }, {})
  console.log('patterns:', patterns)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
