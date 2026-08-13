'use client'

import Link from 'next/link'
import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { safeDate } from '@/lib/assets/model'
import { todayISO } from '@/lib/format'
import { returnAsset } from '../actions'

type Loan = {
  source: 'erp' | 'it'
  borrow_doc_no: string
  asset_code: string
  asset_name: string
  emp_code: string
  emp_name: string | null
  org_department: string | null
  borrowed_at: string
  expected_return: string | null
  is_former_employee: boolean
  days_held: number
}

/** ແຖວໃບຢືມທີ່ຍັງຄ້າງ — ກົດແລ້ວເປີດຟອມບັນທຶກການຄືນຢູ່ໃນແຖວເລີຍ */
export default function ReturnRow({ loan }: { loan: Loan }) {
  const [open, setOpen] = useState(false)

  const overdue =
    loan.expected_return !== null &&
    new Date(loan.expected_return) < new Date(new Date().toDateString())

  return (
    <>
      <tr className="hover-surface transition">
        <td className="px-4 py-2.5 text-xs whitespace-nowrap">
          <span className="font-mono text-muted">{loan.borrow_doc_no}</span>
          <div>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                loan.source === 'erp'
                  ? 'bg-brand-navy/10 text-muted dark:bg-white/5'
                  : 'bg-brand-sky/20 text-brand-navy dark:text-brand-sky'
              }`}
            >
              {loan.source === 'erp' ? 'ERP' : 'ລະບົບນີ້'}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <Link
            href={`/assets/${encodeURIComponent(loan.asset_code)}`}
            className="text-fg underline-offset-2 hover:underline"
          >
            {loan.asset_name}
          </Link>
          <div className="font-mono text-xs text-muted">{loan.asset_code}</div>
        </td>
        <td className="px-4 py-2.5">
          <span className="text-body">{loan.emp_name ?? loan.emp_code}</span>
          {loan.is_former_employee && (
            <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
              ອອກແລ້ວ
            </span>
          )}
          <div className="text-xs text-muted">{loan.org_department ?? '—'}</div>
        </td>
        <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">
          {safeDate(loan.borrowed_at)}
          <div className="text-[11px] text-faint">{loan.days_held} ມື້ກ່ອນ</div>
        </td>
        <td className="px-4 py-2.5 text-xs whitespace-nowrap">
          {loan.expected_return ? (
            <span className={overdue ? 'font-medium text-brand-orange' : 'text-muted'}>
              {safeDate(loan.expected_return)}
              {overdue && ' (ເລີຍກຳນົດ)'}
            </span>
          ) : (
            <span className="text-faint">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn-secondary rounded-lg px-3 py-1.5 text-xs"
          >
            {open ? 'ຍົກເລີກ' : '↩ ບັນທຶກການຄືນ'}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={6} className="bg-brand-blue/5 px-4 py-3">
            <ActionForm
              action={returnAsset}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="asset_code" value={loan.asset_code} />

              <label className="flex flex-col gap-1 text-xs text-muted">
                ວັນທີຄືນ
                <input
                  type="date"
                  name="returned_at"
                  defaultValue={todayISO()}
                  className="input w-40 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-muted">
                ສະພາບເຄື່ອງ
                <select
                  name="return_condition"
                  defaultValue="good"
                  className="input w-36 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="good">ປົກກະຕິ</option>
                  <option value="damaged">ເສຍຫາຍ</option>
                  <option value="lost">ສູນຫາຍ</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-muted">
                ໝາຍເຫດ
                <input
                  name="return_note"
                  className="input w-64 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>

              <SubmitButton className="btn-primary rounded-lg px-4 py-1.5 text-sm font-medium">
                ບັນທຶກການຄືນ
              </SubmitButton>
            </ActionForm>
          </td>
        </tr>
      )}
    </>
  )
}
