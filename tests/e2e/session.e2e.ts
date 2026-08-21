import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Page } from '@playwright/test'
import { BASE_URL, errorsOf, newPage, startHarness, stopHarness } from './harness'

/**
 * The app makes one claim: log a set in one tap, prefilled from last time.
 * These drive a real browser at phone size to prove that claim, rather than
 * trusting the unit tests over the logic in isolation.
 */

beforeAll(startHarness)
afterAll(stopHarness)

const logSet = (page: Page) => page.getByRole('button', { name: /^Log set/ }).click()

async function enterWeight(page: Page, value: string) {
  await page.getByRole('button', { name: /^Weight/ }).click()
  for (const ch of value) {
    await page.getByRole('button', { name: ch, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Set', exact: true }).click()
}

async function setReps(page: Page, target: number) {
  for (let i = 0; i < 25; i++) {
    const label = (await page.getByRole('button', { name: /^Reps/ }).getAttribute('aria-label')) ?? ''
    const current = Number(label.replace(/\D+/g, ''))
    if (current === target) return
    await page
      .getByRole('button', { name: current < target ? 'Increase Reps' : 'Decrease Reps' })
      .click()
  }
  throw new Error(`could not reach ${target} reps`)
}

async function weightLabel(page: Page): Promise<string> {
  return (await page.getByRole('button', { name: /^Weight/ }).getAttribute('aria-label')) ?? ''
}

/** Logs one token set and saves, so the session counts toward the rotation. */
async function quickFinish(page: Page, weight: string) {
  await enterWeight(page, weight)
  await logSet(page)
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.getByRole('button', { name: 'Finish and save' }).click()
  await page.getByText('Up next').waitFor()
}

describe('logging a workout', () => {
  it('takes one tap per set, survives a reload, and prefills the next session', async () => {
    const page = await newPage()
    await page.goto(BASE_URL)

    await page.getByText('Up next').waitFor()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByText('Set 1 of 4').waitFor()

    // Only the first set of a brand-new lift needs input.
    await enterWeight(page, '135')
    await setReps(page, 8)
    await logSet(page)
    await page.getByText('Set 2 of 4').waitFor()

    // Sets 2 and 3 are one tap each: weight and reps carried forward.
    expect(await weightLabel(page)).toMatch(/135/)
    await logSet(page)
    await page.getByText('Set 3 of 4').waitFor()
    await logSet(page)
    await page.getByText('Set 4 of 4').waitFor()

    // A reload mid-workout must not cost a single set.
    await page.reload()
    await page.getByText('Set 4 of 4').waitFor()
    expect(await page.locator('.setchip').count()).toBe(3)

    await logSet(page)
    // The last set auto-advances to the next exercise. Zero taps.
    await page.getByText('Dumbbell Shoulder Press').first().waitFor()

    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Finish and save' }).click()
    await page.getByText('Last workout').waitFor()

    // Rotate through Pull and Legs so Push comes back around.
    await page.getByRole('button', { name: 'Start workout' }).click()
    await quickFinish(page, '95')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await quickFinish(page, '185')

    // Second Push session — the whole point of the app.
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByText('Barbell Bench Press - Medium Grip').first().waitFor()

    // Every set hit 8 reps, the top of 5-8, so the bar comes up 5 lb heavier
    // already dialled in — without a tap.
    expect(await weightLabel(page)).toMatch(/140/)
    await page.getByText('Up from last time').waitFor()
    // 140 lb on a 45 lb bar is a 45 and a 2.5 per side.
    await page.getByText('45 · 2.5').waitFor()

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })

  it('ramps warmups that never count toward a record', async () => {
    const page = await newPage()
    await page.goto(BASE_URL)
    await page.getByRole('button', { name: 'Start workout' }).click()
    await enterWeight(page, '225')

    await page.getByRole('button', { name: /Add \d+ warmup sets/ }).click()
    await page.locator('.setchip.warm').first().waitFor()
    expect(await page.locator('.setchip.warm').count()).toBe(4)

    await logSet(page)
    await page.locator('.pr-toast').waitFor()
    expect(await page.locator('.pr-toast').innerText()).toContain('HEAVIEST')

    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Finish and save' }).click()
    await page.getByText('Last workout').waitFor()

    // The real claim: the empty-bar warmup did not become a record. The heaviest
    // bench on file is the 225 work set, and the 4 warmup sets are not counted.
    await page.goto(`${BASE_URL}/library`)
    await page.getByLabel('Search exercises').fill('bench press medium')
    await page.locator('.ex-row').first().click()
    await page.getByText('Your records').waitFor()

    const records = await page.locator('.record').allInnerTexts()
    expect(records.join(' ')).toContain('225')
    expect(records.join(' ')).not.toContain('45 lb')

    const sessionLine = await page.locator('.history-list li').first().innerText()
    expect(sessionLine).toContain('225×5')
    expect(sessionLine).not.toContain('45×8')

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })
})

describe('library', () => {
  it('filters by tapping a muscle on the body map', async () => {
    const page = await newPage()
    await page.goto(`${BASE_URL}/library`)
    await page.getByText(/^\d+ exercises$/).waitFor()

    const before = Number((await page.getByText(/^\d+ exercises$/).innerText()).split(' ')[0])
    expect(before).toBeGreaterThan(100)

    await page.locator('[data-muscle="biceps"]').first().click()
    await page.waitForFunction(
      (n) => {
        const el = document.querySelector('.results-head .eyebrow')
        return el && Number(el.textContent?.split(' ')[0]) < n
      },
      before,
    )

    const after = Number((await page.getByText(/^\d+ exercises$/).innerText()).split(' ')[0])
    expect(after).toBeLessThan(before)
    expect(await page.locator('.ex-name').first().innerText()).toMatch(/curl/i)

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })

  it('shows how to perform a lift, loaded on demand', async () => {
    const page = await newPage()
    await page.goto(`${BASE_URL}/library`)
    await page.locator('.ex-row').first().click()

    await page.getByText('How to perform').waitFor()
    expect(await page.locator('.steps li').count()).toBeGreaterThan(0)
    expect(await page.locator('.sheet .demo img').count()).toBe(2)

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })
})
