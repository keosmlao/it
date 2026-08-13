import { getCurrentUser } from '@/lib/auth/session'
import { respond } from '@/lib/export/builders'
import { buildDataset, canExport, isDataset } from '@/lib/export/datasets'

export const dynamic = 'force-dynamic'

/**
 * ດຶງຂໍ້ມູນອອກເປັນ Excel / CSV / PDF.
 *
 * ເສັ້ນທາງນີ້ຢູ່ນອກ (app)/layout.tsx ຈຶ່ງບໍ່ໄດ້ຮັບດ່ານກັນ requester ອັດຕະໂນມັດ —
 * ຕ້ອງກວດສິດເອງທຸກຄັ້ງ (canExport ກວດທັງ useStaffArea ແລະ ສິດຂອງແຕ່ລະຊຸດຂໍ້ມູນ)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { dataset } = await params
  if (!isDataset(dataset)) return new Response('Not found', { status: 404 })
  if (!canExport(user, dataset)) return new Response('Forbidden', { status: 403 })

  const url = new URL(request.url)
  const data = await buildDataset(dataset, user, {
    from: validDate(url.searchParams.get('from')),
    to: validDate(url.searchParams.get('to')),
    q: url.searchParams.get('q')?.slice(0, 100) || undefined,
    state: url.searchParams.get('state')?.slice(0, 20) || undefined,
  })

  return respond(url.searchParams.get('format') ?? 'xlsx', data)
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}
