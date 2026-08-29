import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { query } from '@/lib/db'
import { emailConfigured } from '@/lib/notify/email'
import EmailRow from './email-row'
import EmailForm from './email-form'

export const metadata = { title: 'ອີເມວແຈ້ງເຕືອນ' }

type Target = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  line_target: string | null
  email_target: string | null
  email_enabled: boolean
}

export default async function NotifyEmailsPage({
  searchParams,
}: PageProps<'/admin/emails'>) {
  const params = await searchParams
  const user = await requireUser()
  if (!can.administer(user)) notFound()

  const q = pick(params.q)
  const only = pick(params.only)

  const rows = await query<Target>(
    `select employee_id, employee_code, fullname_lo, line_target, email_target,
            email_enabled
       from it.v_notify_targets
      where is_active
        and ($1::text is null or fullname_lo ilike $1::text
             or employee_code ilike $1::text or email_target ilike $1::text)
        and ($2::boolean is false or (line_target is null and email_target is null))
      order by fullname_lo
      limit 400`,
    [q ? `%${q}%` : null, only === 'missing']
  )

  const stats = (
    await query<{ total: string; with_email: string; no_channel: string }>(
      `select count(*)                                              as total,
              count(*) filter (where email_target is not null)      as with_email,
              count(*) filter (where line_target is null
                                 and email_target is null)          as no_channel
         from it.v_notify_targets
        where is_active`
    )
  )[0]

  const configured = emailConfigured()

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          ພະນັກງານທີ່ໃຊ້ງານຢູ່ {stats?.total ?? 0} ຄົນ · ມີອີເມວແລ້ວ{' '}
          {stats?.with_email ?? 0} ·{' '}
          <span className="font-medium text-brand-orange">
            ບໍ່ມີຊ່ອງທາງໃດເລີຍ {stats?.no_channel ?? 0}
          </span>
        </p>
        <Link href="/admin" className="btn-secondary rounded-lg px-4 py-2 text-sm">
          ← ຕັ້ງຄ່າລະບົບ
        </Link>
      </div>

      <p
        className={`mt-4 rounded-lg px-4 py-3 text-sm ${
          configured
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-brand-orange/10 text-brand-orange'
        }`}
      >
        {configured
          ? '✓ ຕັ້ງ SMTP ແລ້ວ — ຂໍ້ຄວາມທາງອີເມວຈະຖືກສົ່ງໃນຮອບຕໍ່ໄປຂອງຄິວ'
          : '⚠️ ຍັງບໍ່ໄດ້ຕັ້ງ SMTP_HOST / SMTP_FROM ໃນ .env.local — ບັນທຶກອີເມວໄວ້ກ່ອນໄດ້ ແຕ່ຈະຍັງບໍ່ສົ່ງ'}
      </p>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່, ລະຫັດ, ອີເມວ"
            className="input w-56 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="only"
            value="missing"
            defaultChecked={only === 'missing'}
            className="size-4"
          />
          ສະເພາະຄົນທີ່ບໍ່ມີຊ່ອງທາງໃດເລີຍ
        </label>
        <button type="submit" className="btn-secondary rounded-lg px-4 py-1.5 text-sm">
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="glass-card divide-line mt-5 divide-y rounded-xl">
        {rows.map((t) => (
          <EmailRow key={t.employee_id} target={t} />
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">ບໍ່ພົບພະນັກງານ</p>
        )}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-fg">ທົດສອບການເຊື່ອມຕໍ່ SMTP</h2>
      <EmailForm />
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}
