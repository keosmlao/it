import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getTicket } from '@/lib/tickets/queries'
import { getAttachment, ticketFolder } from '@/lib/tickets/attachments'
import { docFolder, isDocEntity } from '@/lib/attachments/documents'
import { readStoredFile } from '@/lib/uploads'

/**
 * ສົ່ງໄຟລ໌ແນບໃຫ້ browser. ໄຟລ໌ເກັບຢູ່ນອກ public/ ຈຶ່ງຕ້ອງຜ່ານ route ນີ້
 * ເຊິ່ງກວດສິດກ່ອນສະເໝີ.
 *
 * ຂອບເຂດການເບິ່ງເຫັນມີ 2 ແບບ:
 *   • ຮູບຂອງ ticket — ຕາມຂອບເຂດຂອງ ticket ນັ້ນ (ຜູ້ແຈ້ງເຫັນສະເພາະຂອງຕົນ)
 *   • ເອກະສານຂອງໂມດູນອື່ນ (ສັນຍາ, ໃບບິນ, ໃບຮັບປະກັນ) — ພະນັກງານ IT ເທົ່ານັ້ນ
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const attachment = await getAttachment(id)
  if (!attachment) return new NextResponse('Not found', { status: 404 })

  let folder: string | null = null

  if (attachment.entity_type === 'ticket' && attachment.ticket_id) {
    const ticket = await getTicket(user, attachment.ticket_id)
    if (!ticket) return new NextResponse('Not found', { status: 404 })
    folder = ticketFolder(attachment.ticket_id)
  } else if (isDocEntity(attachment.entity_type)) {
    if (!can.useStaffArea(user)) return new NextResponse('Forbidden', { status: 403 })
    folder = docFolder(attachment.entity_type, attachment.entity_id)
  }

  if (!folder) return new NextResponse('Not found', { status: 404 })

  const file = await readStoredFile(folder, attachment.stored_name)
  if (!file) return new NextResponse('Not found', { status: 404 })

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': attachment.mime_type,
      'Content-Length': String(attachment.size_bytes),
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.file_name)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
