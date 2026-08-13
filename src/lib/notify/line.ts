import 'server-only'

/**
 * ສົ່ງຂໍ້ຄວາມຫາ LINE ຜ່ານ Messaging API (push message).
 *
 * ຕ້ອງຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN ໃນ .env.local ກ່ອນ —
 * ຖ້າຍັງບໍ່ໄດ້ຕັ້ງ ຈະຄືນ error ແບບອ່ານເຂົ້າໃຈ ແລ້ວຂໍ້ຄວາມຄ້າງຢູ່ຄິວ
 * (ບໍ່ຫາຍ) ລໍໃຫ້ຕັ້ງຄ່າແລ້ວກົດສົ່ງໃໝ່ໄດ້
 */
const ENDPOINT = 'https://api.line.me/v2/bot/message/push'
const TIMEOUT_MS = 10_000

export function lineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN)
}

export type SendResult = { ok: true } | { ok: false; error: string }

export async function pushLine(to: string, text: string): Promise<SendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    return { ok: false, error: 'ຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN' }
  }
  if (!to) return { ok: false, error: 'ບໍ່ມີ LINE ID ຂອງຜູ້ຮັບ' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      // LINE ຈຳກັດ 5,000 ຕົວອັກສອນຕໍ່ຂໍ້ຄວາມ
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text: text.slice(0, 4900) }],
      }),
      signal: controller.signal,
    })

    if (res.ok) return { ok: true }

    const detail = await res.text()
    return { ok: false, error: `LINE ${res.status}: ${detail.slice(0, 300)}` }
  } catch (e) {
    const err = e as Error
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'ຕິດຕໍ່ LINE ບໍ່ທັນເວລາ' : err.message,
    }
  } finally {
    clearTimeout(timer)
  }
}
