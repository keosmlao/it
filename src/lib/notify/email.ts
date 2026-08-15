import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import type { SendResult } from './line'

/**
 * ສົ່ງອີເມວແຈ້ງເຕືອນຜ່ານ SMTP
 *
 * ໃຊ້ຄູ່ກັບ LINE ບໍ່ແມ່ນແທນ — ຄົນທີ່ບໍ່ໄດ້ຜູກ LINE (ຫຼື ບໍ່ຢາກຜູກ)
 * ຈະໄດ້ຮັບທາງອີເມວແທນ ຈຶ່ງບໍ່ມີໃຜພາດການແຈ້ງເຕືອນ
 *
 * ຄ່າຕັ້ງໃນ .env.local:
 *   SMTP_HOST · SMTP_PORT (465 = TLS ຕັ້ງແຕ່ຕົ້ນ, 587 = STARTTLS)
 *   SMTP_USER · SMTP_PASS · SMTP_FROM
 */
const TIMEOUT_MS = 15_000

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
}

/** ສ້າງເທື່ອດຽວແລ້ວໃຊ້ຄືນ — Next hot-reload ຈຶ່ງບໍ່ເປີດການເຊື່ອມຕໍ່ຊໍ້າ */
const globalForMail = globalThis as unknown as { mailer?: Transporter }

function transport(): Transporter | null {
  if (!emailConfigured()) return null
  if (globalForMail.mailer) return globalForMail.mailer

  const port = Number(process.env.SMTP_PORT ?? '465')
  const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 = ເຂົ້າລະຫັດຕັ້ງແຕ່ຕົ້ນ · ພອດອື່ນຄ່ອຍຍົກເປັນ STARTTLS
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  })

  if (process.env.NODE_ENV !== 'production') globalForMail.mailer = mailer
  return mailer
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<SendResult> {
  const mailer = transport()
  if (!mailer) return { ok: false, error: 'ຍັງບໍ່ໄດ້ຕັ້ງ SMTP_HOST / SMTP_FROM' }
  if (!to) return { ok: false, error: 'ບໍ່ມີທີ່ຢູ່ອີເມວຂອງຜູ້ຮັບ' }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: subject.slice(0, 200),
      text,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 300) }
  }
}

/** ກວດການເຊື່ອມຕໍ່ SMTP — ໃຫ້ໜ້າຕັ້ງຄ່າກົດທົດສອບໄດ້ກ່ອນໃຊ້ຈິງ */
export async function verifyEmail(): Promise<SendResult> {
  const mailer = transport()
  if (!mailer) return { ok: false, error: 'ຍັງບໍ່ໄດ້ຕັ້ງ SMTP_HOST / SMTP_FROM' }

  try {
    await mailer.verify()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 300) }
  }
}
