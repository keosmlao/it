import { scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

// promisify() drops the options overload, so restate the signature we use.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>

/**
 * `public.odg_employee.password` holds a mix of formats written by several
 * in-house apps over the years:
 *
 *   - `scrypt:N:r:p$salt$hex`  — Werkzeug-style, explicit parameters
 *   - `scrypt$salt$hex`        — same layout, parameters left at the defaults
 *   - anything else            — legacy plaintext (all 5 IT staff are still on this)
 *
 * We only ever read this column; rehashing is left to whoever owns the HR app,
 * because other systems authenticate against the same rows.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null
): Promise<boolean> {
  if (!stored || !plain) return false

  if (stored.startsWith('scrypt')) {
    return verifyScrypt(plain, stored)
  }

  return safeEqual(Buffer.from(plain), Buffer.from(stored))
}

/** True when the stored credential is still legacy plaintext. */
export function isLegacyPlaintext(stored: string | null): boolean {
  return !!stored && !stored.startsWith('scrypt')
}

async function verifyScrypt(plain: string, stored: string): Promise<boolean> {
  const [params, salt, digestHex] = stored.split('$')
  if (!salt || !digestHex) return false

  // `scrypt` alone means defaults; `scrypt:32768:8:1` spells them out.
  const [, n = '32768', r = '8', p = '1'] = params.split(':')
  const cost = Number(n)
  const blockSize = Number(r)
  const parallelization = Number(p)
  if (!cost || !blockSize || !parallelization) return false

  const expected = Buffer.from(digestHex, 'hex')
  if (expected.length === 0) return false

  const derived = await scryptAsync(plain, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallelization,
    // scrypt needs roughly 128 * N * r bytes; node's default cap is below that
    // for N=32768, r=8, so raise it with headroom.
    maxmem: 256 * cost * blockSize,
  })

  return safeEqual(derived, expected)
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
