/**
 * Renders the app icon to the PNG sizes the web manifest and iOS require.
 * Run with `npm run icons`; the output is committed.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = path.resolve('public/icon.svg')
const SIZES = [192, 512]

const svg = await readFile(SRC)

for (const size of SIZES) {
  const out = path.resolve(`public/icon-${size}.png`)
  await writeFile(out, await sharp(svg).resize(size, size).png().toBuffer())
  console.log(`wrote ${path.relative(process.cwd(), out)}`)
}
