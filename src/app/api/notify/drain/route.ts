import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { drainOutbox } from '@/lib/notify/outbox'
import { refreshMovements } from '@/lib/assets/cache'

export const dynamic = 'force-dynamic'

/**
 * ສົ່ງຂໍ້ຄວາມທີ່ຄ້າງຢູ່ຄິວ.
 *
 * ເອີ້ນໄດ້ 2 ທາງ:
 *   • ຕົວຈັດຕາຕະລາງ (cron / Task Scheduler) ດ້ວຍ header `x-notify-secret`
 *   • ຜູ້ຈັດການກົດຈາກໜ້າຕັ້ງຄ່າ
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFY_DRAIN_SECRET
  const provided = request.headers.get('x-notify-secret')

  const authorised =
    (secret && provided === secret) ||
    (await getCurrentUser().then((u) => Boolean(u && can.administer(u))))

  if (!authorised) return new Response('Unauthorized', { status: 401 })

  // ຮອບຕາມຕາຕະລາງນີ້ຍັງໃຊ້ອັບເດດ cache ປະຫວັດຢືມ–ຄືນນຳ ເພື່ອໃຫ້ໃບຢືມ
  // ທີ່ອອກຈາກ ERP ໂດຍກົງປະກົດຢູ່ລະບົບນີ້ພາຍໃນຮອບຖັດໄປ
  const [result] = await Promise.all([drainOutbox(50), refreshMovements()])
  return Response.json(result)
}
