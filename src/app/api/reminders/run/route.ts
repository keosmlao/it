import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { sendDueReminders } from '@/lib/subscriptions/reminders'
import { sendMaintenanceReminders } from '@/lib/maintenance/reminders'

export const dynamic = 'force-dynamic'

/**
 * ວຽກເຕືອນປະຈຳວັນອັນດຽວ — ຄ່າເຊົ່າບໍລິການ + ບຳລຸງຮັກສາຕາມແຜນ
 *
 * ຕັ້ງ Task Scheduler ເອີ້ນອັນນີ້ອັນດຽວມື້ລະເທື່ອ ແທນທີ່ຈະຕັ້ງແຍກແຕ່ລະໂມດູນ
 * (ເສັ້ນທາງເກົ່າ /api/subscriptions/remind ຍັງໃຊ້ໄດ້ ສຳລັບເອີ້ນສະເພາະຄ່າເຊົ່າ)
 *
 * ຂໍ້ຄວາມພຽງແຕ່ເຂົ້າຄິວ — ຕົວສົ່ງແທ້ແມ່ນ /api/notify/drain
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFY_DRAIN_SECRET
  const provided = request.headers.get('x-notify-secret')

  const authorised =
    (secret && provided === secret) ||
    (await getCurrentUser().then((u) => Boolean(u && can.administer(u))))

  if (!authorised) return new Response('Unauthorized', { status: 401 })

  // ແລ່ນຕາມລຳດັບ ບໍ່ແມ່ນພ້ອມກັນ — ທັງສອງຂຽນໃສ່ຄິວແຈ້ງເຕືອນອັນດຽວກັນ
  const subscriptions = await sendDueReminders()
  const maintenance = await sendMaintenanceReminders()

  return Response.json({ subscriptions, maintenance })
}
