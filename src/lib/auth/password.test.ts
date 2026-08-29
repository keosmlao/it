import { randomBytes, scryptSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isLegacyPlaintext, verifyPassword } from './password'

const PASSWORD = 'ລະຫັດລັບ-2026'

/** `scrypt:N:r:p$salt$hex` — ແບບ Werkzeug, salt ໃຊ້ເປັນ string */
function werkzeugHash(plain: string, n = 32768) {
  const salt = randomBytes(8).toString('hex')
  const key = scryptSync(plain, salt, 64, {
    N: n,
    r: 8,
    p: 1,
    maxmem: 256 * n * 8,
  })
  return `scrypt:${n}:8:1$${salt}$${key.toString('hex')}`
}

/** `scrypt$saltB64$keyB64` — ແບບ ERP ເກົ່າ ທີ່ບໍ່ບອກ N/r/p */
function bareHash(plain: string, n = 16384, saltAsBytes = false) {
  const saltB64 = randomBytes(16).toString('base64')
  const salt = saltAsBytes ? Buffer.from(saltB64, 'base64') : saltB64
  const key = scryptSync(plain, salt, 64, {
    N: n,
    r: 8,
    p: 1,
    maxmem: 256 * n * 8,
  })
  return `scrypt$${saltB64}$${key.toString('base64')}`
}

describe('ລະຫັດຜ່ານແບບ Werkzeug (scrypt:N:r:p$salt$hex)', () => {
  it('ລະຫັດຖືກ ເຂົ້າໄດ້', async () => {
    expect(await verifyPassword(PASSWORD, werkzeugHash(PASSWORD))).toBe(true)
  })

  it('ລະຫັດຜິດ ເຂົ້າບໍ່ໄດ້', async () => {
    expect(await verifyPassword('ຜິດ', werkzeugHash(PASSWORD))).toBe(false)
  })
})

// ບັນຊີສ່ວນຫຼາຍໃນ `odg_employee` ເປັນຮູບແບບນີ້ — ເມື່ອກ່ອນອ່ານເປັນ hex
// ຈຶ່ງບໍ່ເຄີຍກົງ ແລະ ຄົນເຫຼົ່ານັ້ນເຂົ້າລະບົບບໍ່ໄດ້ເລີຍ
describe('ລະຫັດຜ່ານແບບ ERP ເກົ່າ (scrypt$saltB64$keyB64)', () => {
  it('salt ເປັນ string, N=16384', async () => {
    expect(await verifyPassword(PASSWORD, bareHash(PASSWORD, 16384))).toBe(true)
  })

  it('salt ເປັນ bytes, N=32768', async () => {
    const stored = bareHash(PASSWORD, 32768, true)
    expect(await verifyPassword(PASSWORD, stored)).toBe(true)
  })

  it('ລະຫັດຜິດ ບໍ່ກົງກັບຊຸດ parameter ໃດເລີຍ', async () => {
    expect(await verifyPassword('ຜິດ', bareHash(PASSWORD, 16384))).toBe(false)
  })
})

describe('ຮູບແບບອື່ນ', () => {
  it('plaintext ເກົ່າ ຍັງໃຊ້ໄດ້', async () => {
    expect(await verifyPassword('1234', '1234')).toBe(true)
    expect(await verifyPassword('12345', '1234')).toBe(false)
  })

  it('ບໍ່ມີລະຫັດເກັບໄວ້ ເຂົ້າບໍ່ໄດ້', async () => {
    expect(await verifyPassword('1234', null)).toBe(false)
    expect(await verifyPassword('', '1234')).toBe(false)
  })

  it('ນັບສະເພາະ plaintext ວ່າເປັນຂອງເກົ່າ', () => {
    expect(isLegacyPlaintext('1234')).toBe(true)
    expect(isLegacyPlaintext(bareHash(PASSWORD))).toBe(false)
    expect(isLegacyPlaintext(werkzeugHash(PASSWORD))).toBe(false)
    expect(isLegacyPlaintext(null)).toBe(false)
  })
})
