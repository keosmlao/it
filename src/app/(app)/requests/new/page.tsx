import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getRequestTypes } from '@/lib/requests/queries'
import NewRequestForm from './new-request-form'

export const metadata = { title: 'ສ້າງຄຳຮ້ອງ' }

export default async function NewRequestPage() {
  await requireUser()
  const types = await getRequestTypes()

  return (
    <div className="w-full">
      <Link
        href="/requests"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← ກັບໄປລາຍການຄຳຮ້ອງ
      </Link>
      <p className="mt-1 text-sm text-muted">
        ຄຳຮ້ອງຈະສົ່ງໃຫ້ຫົວໜ້າໜ່ວຍງານອະນຸມັດກ່ອນ ແລ້ວຈຶ່ງເຖິງຜູ້ຈັດການ
      </p>

      <NewRequestForm types={types} />
    </div>
  )
}
