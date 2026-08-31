import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { listAccountSystems } from '@/lib/accounts/queries'
import { getSubscriptionOptions } from '@/lib/incidents/queries'
import { getOwnerOptions } from '@/lib/subscriptions/queries'
import { SYSTEM_KIND_LABEL_LO } from '@/lib/accounts/model'
import SystemForm from './system-form'
import SystemRow from './system-row'

export const metadata = { title: 'ລະບົບທີ່ມີບັນຊີ' }

export default async function AccountSystemsPage() {
  const user = await requireMenuView('/accounts/systems')
  if (!can.manageAccounts(user)) notFound()

  const [systems, subscriptions, owners] = await Promise.all([
    listAccountSystems(true),
    getSubscriptionOptions(),
    getOwnerOptions(),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ລະບົບທີ່ພະນັກງານມີບັນຊີຢູ່ — ຜູກກັບສັນຍາເຊົ່າແລ້ວຈະທຽບໄດ້ວ່າຈ່າຍໄປຈັກ seat
          ແລະ ໃຊ້ຈິງຈັກຄົນ
        </p>
        <Link href="/accounts" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ← ບັນຊີຜູ້ໃຊ້
        </Link>
      </div>

      <div className="glass-card divide-line mt-5 divide-y rounded-xl">
        {systems.map((s) => (
          <SystemRow key={s.code} system={s} />
        ))}
        {systems.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            ຍັງບໍ່ມີລະບົບ — ເພີ່ມອັນທຳອິດຢູ່ຟອມລຸ່ມນີ້
          </p>
        )}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-fg">ເພີ່ມລະບົບໃໝ່</h2>
      <p className="mt-0.5 text-xs text-muted">
        ປະເພດທີ່ຮອງຮັບ: {Object.values(SYSTEM_KIND_LABEL_LO).join(' · ')}
      </p>
      <SystemForm subscriptions={subscriptions} owners={owners} />
    </div>
  )
}
