import { chromium, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT = process.env.SHOT_DIR || '/tmp/shots'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:4173'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const scheme = process.argv[2] === 'light' ? 'light' : 'dark'
const suffix = scheme === 'light' ? '-light' : ''
const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: scheme })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))

const shot = async (name) => {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${name}${suffix}.png` })
}

// Seed a couple of finished workouts so the screens have something real in them.
await page.goto(BASE)
await page.getByText('Up next').waitFor()

const enter = async (v) => {
  await page.getByRole('button', { name: /^Weight/ }).click()
  for (const c of v) await page.getByRole('button', { name: c, exact: true }).click()
  await page.getByRole('button', { name: 'Set', exact: true }).click()
}
const log = () => page.getByRole('button', { name: /^Log set/ }).click()

await page.getByRole('button', { name: 'Start workout' }).click()
await enter('185')
await log(); await log(); await log(); await log()
await enter('60'); await log(); await log(); await log()
await page.getByRole('button', { name: 'Finish' }).click()
await page.getByRole('button', { name: 'Finish and save' }).click()
await page.getByText('Last workout').waitFor()

await page.getByRole('button', { name: 'Start workout' }).click()
await enter('315'); await log()
await page.getByRole('button', { name: 'Finish' }).click()
await page.getByRole('button', { name: 'Finish and save' }).click()
await page.getByText('Last workout').waitFor()
await shot('today')

// Mid-set, with rest running and a plate breakdown on screen.
await page.getByRole('button', { name: 'Start workout' }).click()
await enter('225')
await page.getByRole('button', { name: /Add \d+ warmup sets/ }).click()
await log()
await shot('session')

await page.getByRole('button', { name: 'Finish' }).click()
await page.getByRole('button', { name: 'Finish and save' }).click()

for (const [path, name] of [
  ['/library', 'library'],
  ['/routines', 'routines'],
  ['/progress', 'progress'],
  ['/settings', 'settings'],
]) {
  await page.goto(BASE + path)
  await shot(name)
}

await page.goto(BASE + '/library')
await page.getByLabel('Search exercises').fill('barbell squat')
await page.locator('.ex-row').first().click()
await page.getByText('How to perform').waitFor()
await shot('detail')

await browser.close()
console.log('shots written to', OUT)
