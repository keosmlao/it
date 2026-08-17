'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { deleteTicket } from './actions'

/**
 * ປຸ່ມລຶບ ticket — ຕ້ອງກົດສອງເທື່ອ
 *
 * ເຫດຜົນ: ຢູ່ຕາຕະລາງແຖວຕິດກັນຖີ່ ກົດຜິດງ່າຍ ແລະ ບໍ່ໄດ້ໃຊ້ window.confirm
 * (ບາງ browser ບລັອກ ແລະ ອ່ານເປັນລາວບໍ່ໄດ້) ຈຶ່ງໃຫ້ຢືນຢັນຢູ່ໃນໜ້າເລີຍ
 */
export default function DeleteTicketButton({
  ticketId,
  ticketNo,
}: {
  ticketId: string
  ticketNo: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`ລຶບ ${ticketNo}`}
        className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-red-600"
      >
        ລຶບ
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1">
      <ActionForm action={deleteTicket}>
        <input type="hidden" name="ticket_id" value={ticketId} />
        <SubmitButton
          pendingLabel="…"
          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          ລຶບຖິ້ມ
        </SubmitButton>
      </ActionForm>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg px-2 py-1 text-xs text-muted hover:text-body"
      >
        ຍົກເລີກ
      </button>
    </span>
  )
}
