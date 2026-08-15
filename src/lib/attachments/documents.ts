import 'server-only'
import { query } from '@/lib/db'
import type { SavedFile } from '@/lib/uploads'

/**
 * ເອກະສານແນບຂອງໂມດູນອື່ນ (ບໍ່ແມ່ນ ticket)
 *
 * ໃຊ້ຕາຕະລາງ it.attachments ອັນດຽວກັບຮູບແນບຂອງ ticket — ຕ່າງກັນທີ່
 * (entity_type, entity_id) ແທນ ticket_id. ໂຄງເກັບໄຟລ໌ ແລະ ເສັ້ນທາງເສີບ
 * `/api/attachments/[id]` ໃຊ້ຮ່ວມກັນໝົດ ຈຶ່ງບໍ່ມີສອງລະບົບໃຫ້ດູແລ
 */

export const DOC_ENTITIES = ['subscription', 'asset', 'incident', 'vendor'] as const
export type DocEntity = (typeof DOC_ENTITIES)[number]

export const DOC_ENTITY_LABEL_LO: Record<DocEntity, string> = {
  subscription: 'ສັນຍາເຊົ່າ',
  asset: 'ອຸປະກອນ',
  incident: 'ເຫດຂັດຂ້ອງ',
  vendor: 'ຜູ້ຂາຍ',
}

export type Document = {
  id: string
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

export function isDocEntity(value: string): value is DocEntity {
  return (DOC_ENTITIES as readonly string[]).includes(value)
}

/**
 * ໂຟນເດີໃນ disk
 *
 * ຕົວອ່ານໄຟລ໌ຮັບແຕ່ຊື່ໂຟນເດີເປັນຕົວພິມນ້ອຍ (ກັນ path traversal) ແຕ່ລະຫັດ
 * ອຸປະກອນເປັນຕົວພິມໃຫຍ່ — ຈຶ່ງແປງເປັນນ້ອຍ ເຊິ່ງບໍ່ຊົນກັນເພາະລະຫັດທັງໝົດ
 * ໃຊ້ຕົວພິມໃຫຍ່ຢູ່ແລ້ວ
 */
export function docFolder(entityType: DocEntity, entityId: string) {
  return `docs/${entityType}/${entityId.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`
}

export async function listDocuments(entityType: DocEntity, entityId: string) {
  return query<Document>(
    `select id, entity_type, entity_id, kind, file_name, stored_name, mime_type,
            size_bytes, uploaded_by, uploaded_by_name, uploaded_by_nickname, created_at
       from it.v_attachments
      where entity_type = $1::varchar and entity_id = $2::varchar
      order by created_at desc`,
    [entityType, entityId]
  )
}

export async function recordDocuments(
  entityType: DocEntity,
  entityId: string,
  files: SavedFile[],
  uploadedBy: number
) {
  for (const file of files) {
    await query(
      `insert into it.attachments
         (entity_type, entity_id, kind, file_name, stored_name, mime_type,
          size_bytes, uploaded_by)
       values ($1::varchar, $2::varchar, 'document', $3::varchar, $4::varchar,
               $5::varchar, $6::int, $7::int)`,
      [
        entityType,
        entityId,
        file.fileName,
        file.storedName,
        file.mimeType,
        file.sizeBytes,
        uploadedBy,
      ]
    )
  }
}

/** ນັບເອກະສານຂອງຫຼາຍລາຍການພ້ອມກັນ — ໃຊ້ໃນໜ້າລາຍການ */
export async function countDocuments(entityType: DocEntity) {
  return query<{ entity_id: string; total: string }>(
    `select entity_id, count(*) as total
       from it.v_attachments
      where entity_type = $1::varchar
      group by entity_id`,
    [entityType]
  )
}

/** ລຶບແບບ soft — ໄຟລ໌ໃນ disk ຄົງໄວ້ ເພື່ອກູ້ຄືນໄດ້ຖ້າລຶບຜິດ */
export async function softDeleteDocument(id: string, entityType: DocEntity) {
  const rows = await query<{ entity_id: string }>(
    `update it.attachments
        set deleted_at = now()
      where id = $1::bigint and entity_type = $2::varchar and deleted_at is null
      returning entity_id`,
    [id, entityType]
  )
  return rows[0] ?? null
}
