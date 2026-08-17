import 'server-only'
import { query } from '@/lib/db'
import type { SavedFile } from '@/lib/uploads'

export type AttachmentKind = 'report' | 'evidence'

export type Attachment = {
  id: string
  /** null ສຳລັບເອກະສານຂອງໂມດູນອື່ນ — ເບິ່ງ lib/attachments/documents.ts */
  ticket_id: string | null
  entity_type: string
  entity_id: string
  kind: string
  file_name: string
  stored_name: string
  mime_type: string
  size_bytes: number
  uploaded_by: number
  uploaded_by_name: string
  uploaded_by_nickname: string | null
  created_at: string
}

/** ໂຟນເດີໃນ disk ຂອງ ticket ໜຶ່ງ */
export function ticketFolder(ticketId: string | number) {
  return `tickets/${ticketId}`
}

export async function recordAttachments(
  ticketId: string,
  kind: AttachmentKind,
  files: SavedFile[],
  uploadedBy: number
) {
  for (const file of files) {
    await query(
      // entity_type/entity_id ບັງຄັບຕັ້ງແຕ່ 049 — ຮູບຂອງ ticket ຕ້ອງໃສ່ນຳ
      // ບໍ່ດັ່ງນັ້ນຕິດ not-null ແລະ constraint attachments_ticket_link.
      // ສົ່ງລະຫັດ ticket ສອງຄັ້ງ ເພາະຄໍລຳໜຶ່ງເປັນ bigint ອີກອັນເປັນ varchar —
      // PG11 ອ່ານ $ ອັນດຽວກັນເປັນສອງຊະນິດບໍ່ໄດ້
      `insert into it.attachments
         (ticket_id, entity_type, entity_id, kind, file_name, stored_name,
          mime_type, size_bytes, uploaded_by)
       values ($1::bigint, 'ticket', $2::varchar, $3, $4, $5, $6, $7, $8)`,
      [
        ticketId,
        String(ticketId),
        kind,
        file.fileName,
        file.storedName,
        file.mimeType,
        file.sizeBytes,
        uploadedBy,
      ]
    )
  }
}

export async function listAttachments(ticketId: string) {
  return query<Attachment>(
    `select * from it.v_attachments
      where ticket_id = $1
      order by kind, created_at`,
    [ticketId]
  )
}

export async function getAttachment(id: string) {
  const rows = await query<Attachment>(
    'select * from it.v_attachments where id = $1',
    [id]
  )
  return rows[0] ?? null
}

export async function countEvidence(ticketId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*) from it.v_attachments
      where ticket_id = $1 and kind = 'evidence'`,
    [ticketId]
  )
  return Number(rows[0]?.count ?? 0)
}
