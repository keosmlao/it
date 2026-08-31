import Link from 'next/link'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import {
  getAllEmployees,
  getAssignableStaff,
  getCategories,
  getPriorities,
} from '@/lib/tickets/queries'
import NewTicketForm from './new-ticket-form'

export const metadata = { title: 'ແຈ້ງບັນຫາໃໝ່' }

export default async function NewTicketPage() {
  const user = await requireModuleView('tickets')

  const [categories, priorities, employees, staff] = await Promise.all([
    getCategories(),
    getPriorities(),
    getAllEmployees(),
    getAssignableStaff(user),
  ])

  return (
    <div className="w-full">
      <Link
        href="/tickets"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການ ticket
      </Link>
      <p className="mt-1 text-sm text-muted">
        ກຳນົດເວລາຕອບ ແລະ ເວລາແກ້ໄຂຈະຄິດອັດຕະໂນມັດຕາມລະດັບຄວາມດ່ວນ
      </p>

      <NewTicketForm
        categories={categories}
        priorities={priorities}
        employees={employees}
        staff={staff}
        canAssign={can.assignWork(user)}
        currentUser={{
          employee_id: user.employee_id,
          fullname_lo: user.fullname_lo,
        }}
      />
    </div>
  )
}
