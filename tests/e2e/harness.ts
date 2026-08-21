import { spawn, type ChildProcess } from 'node:child_process'
import { chromium, devices, type Browser, type Page } from '@playwright/test'

export const BASE_URL = 'http://localhost:4173'
const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

let server: ChildProcess | undefined
let browser: Browser | undefined

async function waitForServer(url: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`preview server never came up at ${url}`)
}

export async function startHarness() {
  try {
    await waitForServer(BASE_URL, 1_000)
  } catch {
    server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
      stdio: 'ignore',
      detached: false,
    })
    await waitForServer(BASE_URL)
  }

  browser = await chromium.launch({
    executablePath: CHROMIUM,
    // This container runs as root, where Chromium's sandbox refuses to start.
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
}

export async function stopHarness() {
  await browser?.close()
  server?.kill('SIGTERM')
}

/** A fresh phone-sized page with an empty IndexedDB, so every test starts clean. */
export async function newPage(colorScheme: 'dark' | 'light' = 'dark'): Promise<Page> {
  if (!browser) throw new Error('harness not started')
  const context = await browser.newContext({ ...devices['iPhone 13'], colorScheme })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  ;(page as Page & { errors: string[] }).errors = errors
  return page
}

export const errorsOf = (page: Page): string[] =>
  (page as Page & { errors?: string[] }).errors ?? []
