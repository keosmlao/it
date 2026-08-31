import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getEmployeeOptions, listAccountSystems } from '@/lib/accounts/queries'
import AccountForm from './account-form'

export const metadata = { title: 'ເປີດບັນຊີຜູ້ໃຊ້' }

export default async function NewAccountPage() {
  const user = await requireModuleView('accounts')
  if (!can.manageAccounts(user)) notFound()

  const [systems, employees] = await Promise.all([
    listAccountSystems(),
    getEmployeeOptions(),
  ])

  return (
    <div className="w-full max-w-3xl">
      <p className="text-sm text-muted">
        ບັນທຶກວ່າໃຜມີບັນຊີໃນລະບົບໃດ — ⚠️ ບໍ່ຕ້ອງປ້ອນລະຫັດຜ່ານ
        ເກັບພຽງຊື່ບັນຊີເພື່ອໃຫ້ຮູ້ວ່າຕ້ອງໄປປິດອັນໃດຕອນຄົນລາອອກ
      </p>

      <AccountForm systems={systems} employees={employees} />
    </div>
  )
}
