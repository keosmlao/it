'use client'

import { useActionState, useState } from 'react'
import { EMPTY_STATE } from '@/lib/action-state'
import { SubmitButton } from '@/components/action-form'
import ImagePicker from '@/components/image-picker'
import {
  REQUIRE_EVIDENCE_ON_RESOLVE,
  STATUS_LABEL_LO,
  type TicketStatus,
} from '@/lib/tickets/model'
import { changeStatus } from '../actions'

/**
 * ປ່ຽນສະຖານະ ticket. ເມື່ອເລືອກ "ແກ້ໄຂແລ້ວ" ຊ່ອງວິທີແກ້ໄຂ ແລະ ຮູບຫຼັກຖານ
 * ຈະກາຍເປັນຊ່ອງບັງຄັບຕັ້ງແຕ່ຢູ່ໜ້າຈໍ ຜູ້ໃຊ້ຈຶ່ງບໍ່ຕ້ອງສົ່ງໄປແລ້ວຄ່ອຍຖືກປະຕິເສດ.
 */
export default function StatusForm({
  ticketId,
  transitions,
  currentResolution,
  evidenceCount,
}: {
  ticketId: string
  transitions: TicketStatus[]
  currentResolution: string | null
  evidenceCount: number
}) {
  const [state, formAction] = useActionState(changeStatus, EMPTY_STATE)
  const [next, setNext] = useState<TicketStatus>(transitions[0])

  const resolving = next === 'resolved'
  const unrepairable = next === 'unrepairable'
  // ສ້ອມບໍ່ໄດ້ບັງຄັບເຫດຜົນສະເໝີ ເຖິງເຄີຍຂຽນວິທີແກ້ໄວ້ແລ້ວ — ຄົນລະເລື່ອງກັນ
  const needsResolution = (resolving && !currentResolution) || unrepairable
  const needsEvidence =
    resolving && REQUIRE_EVIDENCE_ON_RESOLVE && evidenceCount === 0

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticket_id" value={ticketId} />

      <select
        name="status"
        value={next}
        onChange={(e) => setNext(e.target.value as TicketStatus)}
        className="input w-full rounded px-2 py-1 text-[13px]"
      >
        {transitions.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL_LO[s]}
          </option>
        ))}
      </select>

      <textarea
        name="resolution"
        rows={3}
        required={needsResolution}
        defaultValue={unrepairable ? '' : (currentResolution ?? '')}
        placeholder={
          unrepairable
            ? 'ສ້ອມບໍ່ໄດ້ຍ້ອນຫຍັງ — ເຊັ່ນ ອາໄຫຼ່ບໍ່ມີແລ້ວ, ຄ່າສ້ອມແພງກວ່າຊື້ໃໝ່ (ຕ້ອງໃສ່)'
            : needsResolution
              ? 'ວິທີແກ້ໄຂ (ຕ້ອງໃສ່)'
              : 'ວິທີແກ້ໄຂ (ບໍ່ບັງຄັບ)'
        }
        className="input w-full rounded px-2 py-1 text-[13px]"
      />

      {(resolving || unrepairable) && (
        <div className="pt-1">
          <ImagePicker
            label={unrepairable ? 'ຮູບສະພາບເຄື່ອງ' : 'ຮູບຫຼັກຖານການແກ້ໄຂ'}
            required={needsEvidence}
            hint={
              unrepairable
                ? 'ຮູບຄວາມເສຍຫາຍ — ໃຊ້ອ້າງອີງຕອນຕັດຈຳໜ່າຍ ຫຼື ຂໍຊື້ໃໝ່ (ບໍ່ບັງຄັບ)'
                : evidenceCount > 0
                  ? `ມີຫຼັກຖານແລ້ວ ${evidenceCount} ຮູບ — ຈະເພີ່ມອີກກໍໄດ້`
                  : 'ຮູບຜົນລັບຫຼັງແກ້ໄຂ ເຊັ່ນ ໜ້າຈໍທີ່ໃຊ້ງານໄດ້ແລ້ວ'
            }
          />
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <SubmitButton
        pendingLabel="ກຳລັງອັບໂຫລດ…"
        className="btn-primary w-full rounded px-3 py-1.5 text-[13px] font-medium"
      >
        ບັນທຶກ
      </SubmitButton>
    </form>
  )
}
