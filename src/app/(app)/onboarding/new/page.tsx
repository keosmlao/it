import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getChecklistTemplates, getEmployeeOptions } from '@/lib/accounts/queries'
import ChecklistForm from './checklist-form'

export const metadata = { title: 'ເລີ່ມຂັ້ນຕອນ' }

export default async function NewChecklistPage() {
  const user = await requireUser()
  if (!can.manageAccounts(user)) notFound()

  // ຄົນທີ່ອອກໄປແລ້ວກໍຕ້ອງເລືອກໄດ້ — ຂັ້ນຕອນພະນັກງານອອກມັກເລີ່ມຫຼັງ HR ໝາຍແລ້ວ
  const [employees, onboard, offboard] = await Promise.all([
    getEmployeeOptions(true),
    getChecklistTemplates('onboard'),
    getChecklistTemplates('offboard'),
  ])

  return (
    <div className="w-full max-w-3xl">
      <p className="text-sm text-muted">
        ເລືອກພະນັກງານ ແລະ ປະເພດ — ລະບົບຈະສ້າງລາຍການທີ່ຕ້ອງເຮັດໃຫ້ຈາກແມ່ແບບ
        ແລ້ວຄ່ອຍຕິກເທື່ອລະຂໍ້
      </p>

      <ChecklistForm
        employees={employees}
        counts={{ onboard: onboard.length, offboard: offboard.length }}
      />

      <div className="glass-card mt-5 grid gap-5 rounded-xl p-5 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-fg">ຂັ້ນຕອນຮັບເຂົ້າ</h2>
          <ol className="mt-2 space-y-1 text-sm text-body">
            {onboard.map((t) => (
              <li key={t.title}>· {t.title}</li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">ຂັ້ນຕອນພະນັກງານອອກ</h2>
          <ol className="mt-2 space-y-1 text-sm text-body">
            {offboard.map((t) => (
              <li key={t.title}>· {t.title}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
