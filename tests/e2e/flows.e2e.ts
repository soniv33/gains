import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BASE_URL, errorsOf, newPage, startHarness, stopHarness } from './harness'

beforeAll(startHarness)
afterAll(stopHarness)

describe('routine builder', () => {
  it('builds a routine from scratch and makes it the one you start', async () => {
    const page = await newPage()
    await page.goto(`${BASE_URL}/routines`)
    await page.getByRole('button', { name: 'Build my own' }).click()

    await page.getByLabel('Routine name').fill('Bench and squat only')
    await page.getByLabel('Day name').fill('Everything')

    for (const name of ['barbell squat', 'barbell bench press medium']) {
      await page.getByRole('button', { name: 'Add exercise' }).click()
      await page.getByLabel('Search exercises').fill(name)
      await page.locator('.sheet .ex-row').first().click()
    }
    expect(await page.locator('.builder-item').count()).toBe(2)

    // Reorder, so bench comes first.
    await page.locator('.builder-item').last().getByRole('button', { name: 'Move up' }).click()
    expect(await page.locator('.builder-item .h2').first().innerText()).toMatch(/Bench/)

    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByText('Your routines').waitFor()

    // Saving a new routine makes it active, so Today offers it immediately.
    await page.goto(BASE_URL)
    await page.getByText('Bench and squat only').waitFor()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByText('Barbell Bench Press - Medium Grip').first().waitFor()

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })
})

describe('settings', () => {
  it('switches to kg, and swaps the bar and plates along with it', async () => {
    const page = await newPage()
    await page.goto(`${BASE_URL}/settings`)

    await page.getByRole('button', { name: 'kg', exact: true }).click()
    // A kg lifter does not own a 45 lb bar; the plate set has to move with it.
    await page.getByText('20 kg').first().waitFor()
    const plates = await page.locator('.card .chip.num').allInnerTexts()
    expect(plates).toContain('25')
    expect(plates).toContain('1.25')
    expect(plates).not.toContain('45')

    // And the session screen must work entirely in kg.
    await page.goto(BASE_URL)
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: /^Weight/ }).click()
    for (const c of '100') await page.getByRole('button', { name: c, exact: true }).click()
    await page.getByRole('button', { name: 'Set', exact: true }).click()

    // 100 kg on a 20 kg bar is 40 kg a side: a 25 and a 15.
    await page.getByText('25 · 15').waitFor()
    const label = await page.getByRole('button', { name: /^Weight/ }).getAttribute('aria-label')
    expect(label).toMatch(/100/)

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })

  it('exports a backup that round-trips through import', async () => {
    const page = await newPage()
    await page.goto(BASE_URL)

    // Log something worth backing up.
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: /^Weight/ }).click()
    for (const c of '185') await page.getByRole('button', { name: c, exact: true }).click()
    await page.getByRole('button', { name: 'Set', exact: true }).click()
    await page.getByRole('button', { name: /^Log set/ }).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Finish and save' }).click()
    await page.getByText('Last workout').waitFor()

    await page.goto(`${BASE_URL}/settings`)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export a backup' }).click()
    const file = await download

    expect(file.suggestedFilename()).toMatch(/^gains-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const path = await file.path()
    const bundle = JSON.parse(await (await import('node:fs/promises')).readFile(path!, 'utf8'))

    expect(bundle.format).toBe('gains.export')
    expect(bundle.sessions).toHaveLength(1)
    expect(bundle.sessions[0].entries[0].sets[0].weight).toBe(185)
    expect(bundle.routines.length).toBeGreaterThan(0)

    expect(errorsOf(page)).toEqual([])
    await page.context().close()
  })
})

describe('offline', () => {
  it('loads and logs a set with the network cut', async () => {
    const page = await newPage()
    // First visit primes the service worker.
    await page.goto(BASE_URL)
    await page.getByText('Up next').waitFor()
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null)

    await page.context().setOffline(true)
    await page.reload()

    // The whole app has to come back with no network at all.
    await page.getByText('Up next').waitFor()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: /^Weight/ }).click()
    for (const c of '135') await page.getByRole('button', { name: c, exact: true }).click()
    await page.getByRole('button', { name: 'Set', exact: true }).click()
    await page.getByRole('button', { name: /^Log set/ }).click()
    await page.locator('.setchip').first().waitFor()

    expect(await page.locator('.setchip').count()).toBe(1)
    await page.context().setOffline(false)
    await page.context().close()
  })
})
