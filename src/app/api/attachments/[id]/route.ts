import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getTicket } from '@/lib/tickets/queries'
import { getAttachment, ticketFolder } from '@/lib/tickets/attachments'
import { readStoredFile } from '@/lib/uploads'

/**
 * ສົ່ງຮູບແນບໃຫ້ browser. ໄຟລ໌ເກັບຢູ່ນອກ public/ ຈຶ່ງຕ້ອງຜ່ານ route ນີ້
 * ເຊິ່ງກວດວ່າຜູ້ຂໍ login ແລ້ວ ແລະ ເບິ່ງເຫັນ ticket ນັ້ນໄດ້ແທ້.
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

  // ຂອບເຂດການເບິ່ງເຫັນອັນດຽວກັນກັບ ticket ຕົ້ນທາງ
  const ticket = await getTicket(user, attachment.ticket_id)
  if (!ticket) return new NextResponse('Not found', { status: 404 })

  const file = await readStoredFile(
    ticketFolder(attachment.ticket_id),
    attachment.stored_name
  )
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
