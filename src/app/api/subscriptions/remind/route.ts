import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { sendDueReminders } from '@/lib/subscriptions/reminders'

export const dynamic = 'force-dynamic'

/**
 * ກວດສັນຍາເຊົ່າທີ່ໃກ້ຮອດກຳນົດ ແລ້ວແຈ້ງເຕືອນ — ຕັ້ງໃຫ້ແລ່ນມື້ລະເທື່ອ
 *
 * ເອີ້ນໄດ້ 2 ທາງ ຄືກັບ /api/notify/drain:
 *   • ຕົວຈັດຕາຕະລາງ (cron / Task Scheduler) ດ້ວຍ header `x-notify-secret`
 *   • ຜູ້ຈັດການກົດເອງ
 *
 * ຂໍ້ຄວາມທີ່ອອກຈາກນີ້ພຽງແຕ່ເຂົ້າຄິວ — ຕົວສົ່ງແທ້ແມ່ນ /api/notify/drain
 * ຈຶ່ງຕ້ອງຕັ້ງໃຫ້ drain ແລ່ນຖີ່ກວ່າວຽກນີ້
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFY_DRAIN_SECRET
  const provided = request.headers.get('x-notify-secret')

  const authorised =
    (secret && provided === secret) ||
    (await getCurrentUser().then((u) => Boolean(u && can.administer(u))))

  if (!authorised) return new Response('Unauthorized', { status: 401 })

  return Response.json(await sendDueReminders())
}
