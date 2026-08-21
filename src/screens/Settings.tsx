import { useRef, useState } from 'react'
import type { Units } from '@/types'
import { useApp } from '@/store/app'
import { downloadExport, readImportFile } from '@/db/export'
import {
  DEFAULT_BAR_KG_AS_LB,
  DEFAULT_BAR_LB,
  DEFAULT_PLATES_KG_AS_LB,
  DEFAULT_PLATES_LB,
  formatWeight,
  fromDisplay,
} from '@/lib/units'

export function SettingsScreen() {
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const importBundle = useApp((s) => s.importBundle)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  /**
   * Switching units also swaps the plate inventory and bar. Someone moving to kg
   * does not own 45 lb plates, and leaving them behind makes every plate
   * breakdown wrong.
   */
  const setUnits = (units: Units) => {
    updateSettings({
      units,
      barWeightLb: units === 'kg' ? DEFAULT_BAR_KG_AS_LB : DEFAULT_BAR_LB,
      platesLb: units === 'kg' ? DEFAULT_PLATES_KG_AS_LB : DEFAULT_PLATES_LB,
      progression: {
        ...settings.progression,
        upperIncrementLb: units === 'kg' ? fromDisplay(2.5, 'kg') : 5,
        lowerIncrementLb: units === 'kg' ? fromDisplay(5, 'kg') : 10,
      },
    })
  }

  return (
    <div className="scroll with-tabs">
      <h1 className="h1">Settings</h1>

      <Group label="Units">
        <div className="row wrap chips">
          {(['lb', 'kg'] as Units[]).map((u) => (
            <button
              key={u}
              type="button"
              className="chip"
              aria-pressed={settings.units === u}
              onClick={() => setUnits(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Theme">
        <div className="row wrap chips">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={settings.theme === t}
              onClick={() => updateSettings({ theme: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Bar weight">
        <NumberField
          value={Number(formatWeight(settings.barWeightLb, settings.units))}
          suffix={settings.units}
          step={settings.units === 'kg' ? 2.5 : 5}
          onChange={(v) => updateSettings({ barWeightLb: fromDisplay(v, settings.units) })}
        />
      </Group>

      <Group label="Plates available (per side)">
        <div className="row wrap chips">
          {settings.platesLb
            .slice()
            .sort((a, b) => b - a)
            .map((p) => (
              <span key={p} className="chip num">
                {formatWeight(p, settings.units)}
              </span>
            ))}
        </div>
        <p className="small faint">
          Used for the plate breakdown and to keep suggested weights loadable.
        </p>
      </Group>

      <Group label="Rest between sets">
        <NumberField
          value={settings.defaultRestSec}
          suffix="s"
          step={15}
          onChange={(v) => updateSettings({ defaultRestSec: Math.max(0, v) })}
        />
      </Group>

      <Group label="Progression">
        <label className="between toggle-row">
          <span>Suggest a heavier prefill</span>
          <input
            type="checkbox"
            checked={settings.progression.enabled}
            onChange={(e) =>
              updateSettings({
                progression: { ...settings.progression, enabled: e.target.checked },
              })
            }
          />
        </label>
        <p className="small faint">
          When every set reaches the top of the rep range, the next session starts{' '}
          {formatWeight(settings.progression.upperIncrementLb, settings.units)} {settings.units}{' '}
          heavier on upper body and{' '}
          {formatWeight(settings.progression.lowerIncrementLb, settings.units)} {settings.units} on
          lower. After {settings.progression.deloadAfterMisses} sessions under the target it backs
          off {Math.round(settings.progression.deloadPct * 100)}%.
        </p>
      </Group>

      <Group label="Your data">
        <p className="small faint">
          Everything lives on this device. This file is the only backup there is — keep one
          somewhere safe.
        </p>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void downloadExport()}>
          Export a backup
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => fileRef.current?.click()}
        >
          Restore from backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              await importBundle(await readImportFile(file))
              setStatus('Restored.')
            } catch (err) {
              setStatus(err instanceof Error ? err.message : 'Could not read that file.')
            }
            e.target.value = ''
          }}
        />
        {status && <p className="small">{status}</p>}
      </Group>

      <p className="small faint credit">
        Exercise data and demo images from{' '}
        <a href="https://github.com/yuhonas/free-exercise-db">free-exercise-db</a>, public domain.
      </p>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="stack setting-group">
      <span className="eyebrow">{label}</span>
      <div className="card stack">{children}</div>
    </section>
  )
}

function NumberField({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  suffix?: string
}) {
  return (
    <div className="row field-row">
      <button type="button" className="stepper-btn sm" onClick={() => onChange(round(value - step))}>
        −
      </button>
      <span className="num field-value">
        {value} {suffix}
      </span>
      <button type="button" className="stepper-btn sm" onClick={() => onChange(round(value + step))}>
        +
      </button>
    </div>
  )
}

const round = (n: number) => Math.round(n * 100) / 100
