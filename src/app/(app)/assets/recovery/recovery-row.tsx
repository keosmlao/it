'use client'

import Link from 'next/link'
import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { safeDate } from '@/lib/assets/model'
import { isoDate } from '@/lib/format'
import {
  RECOVERY_LABEL_LO,
  RECOVERY_STATES,
  RECOVERY_STYLE,
  type RecoveryTarget,
} from '@/lib/assets/stock-model'
import { updateRecovery } from '../stock-actions'

/** ແຖວລາຍການທີ່ຕ້ອງທວງຄືນ — ກົດແລ້ວເປີດຟອມບັນທຶກຄວາມຄືບໜ້າ */
export default function RecoveryRow({ target }: { target: RecoveryTarget }) {
  const [open, setOpen] = useState(false)
  const status = target.recovery_status ?? 'open'
  const years = Math.floor(target.days_held / 365)

  return (
    <>
      <tr className="hover-surface transition">
        <td className="px-4 py-2.5">
          <Link
            href={`/assets/holders/${encodeURIComponent(target.emp_code)}`}
            className="text-fg underline-offset-2 hover:underline"
          >
            {target.emp_name ?? target.emp_code}
          </Link>
          {target.is_former_employee && (
            <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
              ອອກແລ້ວ
            </span>
          )}
          <div className="text-xs text-muted">{target.org_department ?? '—'}</div>
          {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
          <div className="text-xs text-muted md:hidden">
            {target.asset_name}
            <span className="lg:hidden">
              {' '}
              · ຖືມາ {years > 0 ? `${years} ປີ ` : ''}
              {target.days_held % 365} ມື້
            </span>
          </div>
        </td>

        <td className="hidden px-4 py-2.5 md:table-cell">
          <Link
            href={`/assets/${encodeURIComponent(target.asset_code)}`}
            className="text-body underline-offset-2 hover:underline"
          >
            {target.asset_name}
          </Link>
          <div className="font-mono text-xs text-muted">{target.asset_code}</div>
        </td>

        <td className="hidden px-4 py-2.5 text-xs whitespace-nowrap text-muted xl:table-cell">
          {safeDate(target.borrowed_at)}
          {target.borrow_doc_no && (
            <div className="font-mono text-[11px]">{target.borrow_doc_no}</div>
          )}
        </td>

        <td className="hidden px-4 py-2.5 text-right text-xs whitespace-nowrap lg:table-cell">
          <span
            className={
              target.days_held > 730
                ? 'font-medium text-red-600 dark:text-red-400'
                : 'text-muted'
            }
          >
            {years > 0 ? `${years} ປີ ` : ''}
            {target.days_held % 365} ມື້
          </span>
        </td>

        <td className="px-4 py-2.5 whitespace-nowrap">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${RECOVERY_STYLE[status]}`}
          >
            {RECOVERY_LABEL_LO[status]}
          </span>
          {target.promised_date && (
            <div className="text-[11px] text-muted">
              ຮັບປາກ {safeDate(target.promised_date)}
            </div>
          )}
        </td>

        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn-secondary rounded-lg px-3 py-1.5 text-xs"
          >
            {open ? 'ຍົກເລີກ' : 'ບັນທຶກການທວງ'}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={6} className="bg-brand-blue/5 px-4 py-3">
            <ActionForm
              action={updateRecovery}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="asset_code" value={target.asset_code} />
              <input type="hidden" name="emp_code" value={target.emp_code} />

              <label className="flex flex-col gap-1 text-xs text-muted">
                ສະຖານະ
                <select
                  name="status"
                  defaultValue={status}
                  className="input w-44 rounded-lg px-3 py-1.5 text-sm"
                >
                  {RECOVERY_STATES.map((s) => (
                    <option key={s} value={s}>
                      {RECOVERY_LABEL_LO[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-muted">
                ວັນທີຮັບປາກຈະຄືນ
                <input
                  type="date"
                  name="promised_date"
                  defaultValue={isoDate(target.promised_date)}
                  className="input w-40 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-muted">
                ບັນທຶກ
                <input
                  name="note"
                  defaultValue={target.recovery_note ?? ''}
                  placeholder="ຕິດຕໍ່ທາງໃດ, ຜົນເປັນແນວໃດ"
                  className="input w-72 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>

              <SubmitButton className="btn-primary rounded-lg px-4 py-1.5 text-sm font-medium">
                ບັນທຶກ
              </SubmitButton>
            </ActionForm>
          </td>
        </tr>
      )}
    </>
  )
}
