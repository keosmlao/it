import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getAllEmployees, getAssignableStaff, getPriorities } from '@/lib/tickets/queries'
import NewProjectForm from './new-project-form'

export const metadata = { title: 'ສ້າງໂປຣເຈັກ' }

export default async function NewProjectPage() {
  const user = await requireUser()
  if (!can.assignWork(user)) redirect('/projects')

  const [priorities, staff, employees] = await Promise.all([
    getPriorities(),
    getAssignableStaff(user),
    getAllEmployees(),
  ])

  return (
    <div className="w-full">
      <Link
        href="/projects"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການໂປຣເຈັກ
      </Link>

      <NewProjectForm
        priorities={priorities}
        staff={staff}
        employees={employees}
        defaultOwnerId={user.employee_id}
      />
    </div>
  )
}
