'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { logAudit } from '@/lib/activity'
import {
  docFolder,
  isDocEntity,
  listDocuments,
  recordDocuments,
  softDeleteDocument,
  type DocEntity,
} from '@/lib/attachments/documents'
import { pickFiles, saveDocs, validateDocs } from '@/lib/uploads'
import type { FormState } from '@/lib/action-state'

/**
 * ແນບເອກະສານໃສ່ລາຍການໃດກໍໄດ້ (ສັນຍາເຊົ່າ, ອຸປະກອນ, ເຫດຂັດຂ້ອງ, ຜູ້ຂາຍ)
 *
 * ໃຊ້ action ອັນດຽວທຸກໂມດູນ ເພາະຂັ້ນຕອນຄືກັນໝົດ — ຕ່າງກັນພຽງ entity_type
 * ສ່ວນສິດແກ້ອີງຕາມໂມດູນນັ້ນໆ ຈຶ່ງບໍ່ໃຫ້ຄົນທີ່ແກ້ສັນຍາບໍ່ໄດ້ ມາແນບໃສ່ສັນຍາ
 */
function mayEdit(entity: DocEntity, user: Parameters<typeof can.manageAssets>[0]) {
  if (entity === 'subscription' || entity === 'vendor') {
    return can.manageSubscriptions(user)
  }
  return can.manageAssets(user)
}

/** ໜ້າທີ່ຕ້ອງດຶງຂໍ້ມູນໃໝ່ຫຼັງແນບ/ລຶບ */
function pathFor(entity: DocEntity, id: string) {
  const base: Record<DocEntity, string> = {
    subscription: '/subscriptions',
    asset: '/assets',
    incident: '/incidents',
    vendor: '/vendors',
  }
  return `${base[entity]}/${id}`
}

export async function uploadDocuments(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()

  const entity = String(formData.get('entity_type') ?? '').trim()
  const entityId = String(formData.get('entity_id') ?? '').trim()
  if (!isDocEntity(entity)) return { error: 'ປະເພດລາຍການບໍ່ຖືກຕ້ອງ' }
  if (!entityId) return { error: 'ບໍ່ພົບລາຍການທີ່ຈະແນບໃສ່' }
  if (!mayEdit(entity, user)) return { error: 'ບໍ່ມີສິດແນບເອກະສານໃສ່ລາຍການນີ້' }

  const files = pickFiles(formData.getAll('files'))
  if (files.length === 0) return { error: 'ກະລຸນາເລືອກໄຟລ໌' }

  const invalid = validateDocs(files)
  if (invalid.error) return { error: invalid.error }

  const saved = await saveDocs(files, docFolder(entity, entityId))
  if (!saved.ok) return { error: saved.error }

  await recordDocuments(entity, entityId, saved.files, user.employee_id)
  await logAudit(
    user.employee_id,
    `${entity}_document`,
    entityId,
    'upload',
    saved.files.map((f) => f.fileName).join(', ')
  )

  revalidatePath(pathFor(entity, entityId))
  return { ok: true, message: `ແນບແລ້ວ ${saved.files.length} ໄຟລ໌` }
}

/**
 * ລຶບເອກະສານ — ລຶບແບບ soft ຈຶ່ງກູ້ຄືນໄດ້ຖ້າລຶບຜິດ
 * (ໄຟລ໌ຈິງຍັງຢູ່ໃນ disk ແຕ່ບໍ່ມີເສັ້ນທາງໃດເສີບໃຫ້ອີກ)
 */
export async function deleteDocument(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()

  const entity = String(formData.get('entity_type') ?? '').trim()
  const id = String(formData.get('id') ?? '').trim()
  if (!isDocEntity(entity)) return { error: 'ປະເພດລາຍການບໍ່ຖືກຕ້ອງ' }
  if (!mayEdit(entity, user)) return { error: 'ບໍ່ມີສິດລຶບເອກະສານ' }

  const deleted = await softDeleteDocument(id, entity)
  if (!deleted) return { error: 'ບໍ່ພົບເອກະສານນີ້' }

  await logAudit(user.employee_id, `${entity}_document`, id, 'delete')
  revalidatePath(pathFor(entity, deleted.entity_id))
  return { ok: true }
}

/** ໃຫ້ໜ້າ server component ດຶງລາຍການເອກະສານໄດ້ໂດຍບໍ່ຕ້ອງ import lib ຊໍ້າ */
export async function fetchDocuments(entity: DocEntity, entityId: string) {
  return listDocuments(entity, entityId)
}
