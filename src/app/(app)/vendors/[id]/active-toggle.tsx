'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { setVendorActive } from '../actions'

/** ປິດ/ເປີດການໃຊ້ງານ — ບໍ່ໃຫ້ລຶບ ເພາະສັນຍາ ແລະ ໃບສ້ອມເກົ່າຊີ້ມາຫາຢູ່ */
export default function VendorActiveToggle({
  id,
  isActive,
}: {
  id: string
  isActive: boolean
}) {
  return (
    <ActionForm action={setVendorActive} className="mt-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="is_active" value={isActive ? '0' : '1'} />
      <SubmitButton
        className={`rounded-lg px-4 py-2 text-sm ${
          isActive ? 'btn-danger' : 'btn-secondary'
        }`}
      >
        {isActive ? 'ປິດການໃຊ້ງານ' : 'ເປີດໃຊ້ງານຄືນ'}
      </SubmitButton>
    </ActionForm>
  )
}
