import { scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

// promisify() drops the options overload, so restate the signature we use.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>

/**
 * `public.odg_employee.password` holds a mix of formats written by several
 * in-house apps over the years:
 *
 *   - `scrypt:N:r:p$salt$hex`   — Werkzeug-style, parameters spelled out, hex digest
 *   - `scrypt$saltB64$keyB64`   — ERP ເກົ່າ: base64 ທັງສອງ ແລະ **ບໍ່ບອກ** N/r/p
 *   - anything else             — legacy plaintext
 *
 * We only ever read this column; rehashing is left to whoever owns the HR app,
 * because other systems authenticate against the same rows.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null
): Promise<boolean> {
  if (!stored || !plain) return false

  if (stored.startsWith('scrypt:')) return verifyWerkzeugScrypt(plain, stored)
  if (stored.startsWith('scrypt$')) return verifyBareScrypt(plain, stored)

  return safeEqual(Buffer.from(plain), Buffer.from(stored))
}

/** True when the stored credential is still legacy plaintext. */
export function isLegacyPlaintext(stored: string | null): boolean {
  return !!stored && !stored.startsWith('scrypt')
}

/** `scrypt:N:r:p$salt$hex` — salt ໃຊ້ເປັນ string ຕາມ Werkzeug */
async function verifyWerkzeugScrypt(
  plain: string,
  stored: string
): Promise<boolean> {
  const [params, salt, digestHex] = stored.split('$')
  if (!salt || !digestHex) return false

  const [, n, r, p] = params.split(':')
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

/**
 * `scrypt$saltB64$keyB64` — ຮູບແບບຂອງ ERP ເກົ່າ (ບັນຊີສ່ວນຫຼາຍໃນ
 * `odg_employee` ເປັນແບບນີ້ ລວມທັງຜູ້ຈັດການພະແນກ IT)
 *
 * ບໍ່ໄດ້ບັນທຶກ N/r/p ໄວ້ ແລະ ບໍ່ຮູ້ວ່າສົ່ງ salt ເປັນ string ຫຼື bytes
 * ຈຶ່ງລອງຊຸດທີ່ໃຊ້ທົ່ວໄປ. scrypt ບໍ່ຊ້ຳກັນ — ລະຫັດຜິດຈະບໍ່ກົງກັບຊຸດໃດເລີຍ
 * ຈຶ່ງບໍ່ມີທາງ accept ຜິດ (ວິທີດຽວກັນກັບແອັບ HRM ທີ່ໃຊ້ຖານຂໍ້ມູນຮ່ວມກັນ)
 */
async function verifyBareScrypt(
  plain: string,
  stored: string
): Promise<boolean> {
  const [, saltB64, keyB64] = stored.split('$')
  if (!saltB64 || !keyB64) return false

  const expected = Buffer.from(keyB64, 'base64')
  if (expected.length === 0) return false

  // salt ອາດຖືກສົ່ງເປັນ base64-string ຫຼື ເປັນ raw bytes — ລອງທັງສອງ
  const salts: BinaryLike[] = [saltB64, Buffer.from(saltB64, 'base64')]

  for (const salt of salts) {
    for (const cost of [16384, 32768, 65536]) {
      const derived = await scryptAsync(plain, salt, expected.length, {
        N: cost,
        r: 8,
        p: 1,
        maxmem: 256 * cost * 8,
      })
      if (safeEqual(derived, expected)) return true
    }
  }

  return false
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
