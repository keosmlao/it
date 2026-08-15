'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { rateTicket } from '@/app/(portal)/my/actions'

const STARS = [1, 2, 3, 4, 5] as const

const LABEL_LO: Record<number, string> = {
  1: 'ບໍ່ພໍໃຈຢ່າງຍິ່ງ',
  2: 'ບໍ່ພໍໃຈ',
  3: 'ພໍໃຊ້',
  4: 'ພໍໃຈ',
  5: 'ພໍໃຈຫຼາຍ',
}

/**
 * ໃຫ້ຄະແນນຫຼັງເລື່ອງຖືກແກ້
 *
 * ດາວເປັນ radio ຈິງ (ບໍ່ແມ່ນ state ລ້ວນ) ຈຶ່ງສົ່ງໄດ້ເຖິງແມ່ນ JS ບໍ່ທັນໂຫຼດ
 */
export default function RatingForm({
  ticketId,
  current,
}: {
  ticketId: string
  current: { score: number; comment: string | null } | null
}) {
  const [score, setScore] = useState(current?.score ?? 0)

  return (
    <section className="glass-card mt-4 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-fg">
        {current ? 'ຄະແນນທີ່ທ່ານໃຫ້ໄວ້' : 'ພໍໃຈກັບການແກ້ໄຂບໍ?'}
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        ຄະແນນຊ່ວຍໃຫ້ພະແນກ IT ຮູ້ວ່າແກ້ໄດ້ດີແທ້ບໍ ບໍ່ແມ່ນພຽງແກ້ໄວ
      </p>

      <ActionForm action={rateTicket} className="mt-3">
        <input type="hidden" name="ticket_id" value={ticketId} />

        <div className="flex flex-wrap items-center gap-1">
          {STARS.map((s) => (
            <label
              key={s}
              className="cursor-pointer text-2xl leading-none"
              title={LABEL_LO[s]}
            >
              <input
                type="radio"
                name="score"
                value={s}
                defaultChecked={current?.score === s}
                onChange={() => setScore(s)}
                className="sr-only"
              />
              <span className={s <= score ? 'text-brand-yellow' : 'text-faint'}>★</span>
            </label>
          ))}
          <span className="ml-2 text-sm text-muted">{score ? LABEL_LO[score] : ''}</span>
        </div>

        <input
          name="comment"
          maxLength={300}
          defaultValue={current?.comment ?? ''}
          placeholder="ຢາກບອກຫຍັງເພີ່ມບໍ (ບໍ່ບັງຄັບ)"
          className="input mt-3 w-full rounded-lg px-3 py-2 text-sm"
        />

        <SubmitButton className="btn-primary mt-3 rounded-lg px-4 py-2 text-sm font-medium">
          {current ? 'ແກ້ຄະແນນ' : 'ສົ່ງຄະແນນ'}
        </SubmitButton>
      </ActionForm>
    </section>
  )
}
