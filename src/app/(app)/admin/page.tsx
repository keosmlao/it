import Link from 'next/link'
import { query } from '@/lib/db'
import { requireMenuView } from '@/lib/auth/session'
import { getOutboxStats } from '@/lib/notify/outbox'
import { lineConfigured } from '@/lib/notify/line'

export const metadata = { title: 'ຕັ້ງຄ່າລະບົບ' }

/**
 * ໜ້າລວມຂອງການຕັ້ງຄ່າ — ພາເຂົ້າໄປແຕ່ລະເລື່ອງ
 *
 * ເມື່ອກ່ອນທຸກເລື່ອງກອງກັນຢູ່ໜ້າດຽວຍາວ 625 ແຖວ ຕ້ອງເລື່ອນຫາ ແລະ ໜ້າໜັກ
 * ເພາະດຶງຂໍ້ມູນ 10 ຊຸດພ້ອມກັນທຸກຄັ້ງ — ດຽວນີ້ແຍກເປັນເມນູ ແຕ່ລະໜ້າດຶງ
 * ສະເພາະຂອງຕົນ
 */
export default async function AdminPage() {
  await requireMenuView('/admin')

  const [categories, staff, outbox, prSteps] = await Promise.all([
    query<{ n: string }>(
      'select count(*) as n from it.ticket_categories where is_active'
    ),
    query<{ n: string }>('select count(*) as n from it.v_it_staff'),
    getOutboxStats(),
    query<{ n: string }>(
      'select count(*) as n from it.pr_approval_steps where is_active'
    ),
  ])

  const pending = Number(outbox?.pending ?? 0)

  const areas: {
    href: '/admin/sla' | '/admin/categories' | '/admin/permissions'
      | '/admin/purchase-steps' | '/admin/line' | '/admin/emails'
      | '/admin/security' | '/admin/audit'
    title: string
    hint: string
    stat: string
    warn?: boolean
  }[] = [
    {
      href: '/admin/sla',
      title: 'ຂໍ້ຕົກລົງລະດັບການບໍລິການ (SLA)',
      hint: 'ເວລາຕອບ ແລະ ເວລາແກ້ໄຂຕາມລະດັບຄວາມດ່ວນ',
      stat: '4 ລະດັບ',
    },
    {
      href: '/admin/categories',
      title: 'ປະເພດບັນຫາ',
      hint: 'ປະເພດກຳນົດໜ່ວຍງານທີ່ຮັບຜິດຊອບ ticket ໂດຍອັດຕະໂນມັດ',
      stat: `${categories[0]?.n ?? 0} ປະເພດທີ່ໃຊ້ຢູ່`,
    },
    {
      href: '/admin/permissions',
      title: 'ຈັດການສິດ ແລະ ບົດບາດ',
      hint: 'ສິດທົ່ວໄປ, ບົດບາດ ແລະ ສິດ ເບິ່ງ/ເພີ່ມ/ແກ້ໄຂ/ລົບ ຂອງແຕ່ລະເມນູ',
      stat: `${staff[0]?.n ?? 0} ຄົນ`,
    },
    {
      href: '/admin/purchase-steps',
      title: 'ຂັ້ນຕອນອະນຸມັດໃບສະເໜີຊື້',
      hint: 'ໃບສະເໜີຊື້ຜ່ານຂັ້ນໃດແດ່ ແລະ ໃຜອະນຸມັດ',
      stat: `${prSteps[0]?.n ?? 0} ຂັ້ນ`,
      warn: Number(prSteps[0]?.n ?? 0) === 0,
    },
    {
      href: '/admin/line',
      title: 'ແຈ້ງເຕືອນທາງ LINE',
      hint: 'ຄິວຂໍ້ຄວາມ ແລະ ປຸ່ມສົ່ງດ້ວຍມື',
      stat: lineConfigured()
        ? `ຄ້າງຄິວ ${pending}`
        : 'ຍັງບໍ່ໄດ້ຜູກ LINE',
      warn: !lineConfigured() || pending > 0,
    },
    {
      href: '/admin/emails',
      title: 'ອີເມວແຈ້ງເຕືອນ',
      hint: 'ໃຜໄດ້ຮັບອີເມວເລື່ອງໃດແດ່',
      stat: 'ຕັ້ງຄ່າ',
    },
    {
      href: '/admin/security',
      title: 'ກວດຄວາມປອດໄພ',
      hint: 'ບັນຊີຄ້າງເປີດ, ລະຫັດຜ່ານແບບເກົ່າ ແລະ ການເຂົ້າລະບົບທີ່ລົ້ມເຫຼວ',
      stat: 'ກວດເບິ່ງ',
    },
    {
      href: '/admin/audit',
      title: 'ບັນທຶກການປ່ຽນແປງ',
      hint: 'ໃຜແກ້ຫຍັງເມື່ອໃດ — ອ່ານຢ່າງດຽວ',
      stat: 'ປະຫວັດ',
    },
  ]

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ສະເພາະຜູ້ຈັດການ · ການປ່ຽນແປງທັງໝົດຖືກບັນທຶກໄວ້
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="glass-card hover-surface rounded p-3 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-fg">{a.title}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                  a.warn
                    ? 'bg-brand-orange/15 text-brand-orange'
                    : 'bg-brand-blue/10 text-brand-blue dark:text-brand-sky'
                }`}
              >
                {a.stat}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{a.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
