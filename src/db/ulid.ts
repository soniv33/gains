/**
 * ULID: a lexicographically sortable, collision-resistant id.
 *
 * Sortable ids mean session history sorts by id without a secondary key, and
 * the collision resistance is what lets two devices generate ids offline and
 * merge later without coordinating — the reason cloud sync stays additive.
 */
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32
const TIME_LEN = 10
const RANDOM_LEN = 16

function encodeTime(now: number): string {
  let out = ''
  let t = now
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    out = ENCODING[t % 32] + out
    t = Math.floor(t / 32)
  }
  return out
}

function encodeRandom(): string {
  const bytes = new Uint8Array(RANDOM_LEN)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += ENCODING[b % 32]
  return out
}

export function ulid(now = Date.now()): string {
  return encodeTime(now) + encodeRandom()
}
