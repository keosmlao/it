'use client'

import Link from 'next/link'
import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { safeDate } from '@/lib/assets/model'
import {
  STOCK_LABEL_LO,
  STOCK_STATES,
  STOCK_STYLE,
  type SurveyRow as Row,
} from '@/lib/assets/stock-model'
import { markStock } from '../stock-actions'

/** ແຖວສຳຫຼວດ — ກົດແລ້ວໝາຍສະຖານະຈິງຂອງເຄື່ອງ */
export default function SurveyRow({ row }: { row: Row }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr className="hover-surface transition">
        <td className="px-3 py-1.5">
          <Link
            href={`/assets/${encodeURIComponent(row.asset_code)}`}
            className="text-fg underline-offset-2 hover:underline"
          >
            {row.name}
          </Link>
          <div className="font-mono text-xs text-muted">
            {row.asset_code}
            {row.serial_no && ` · ${row.serial_no}`}
          </div>
          {Number(row.movement_count) === 0 && (
            <span className="mt-1 inline-block rounded-full bg-brand-orange/20 px-2 py-0.5 text-[11px] text-brand-orange">
              ບໍ່ເຄີຍມີໃບຢືມ
            </span>
          )}
          {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
          <div className="text-xs text-muted md:hidden">
            {row.location_name ?? 'ບໍ່ລະບຸສະຖານທີ່'}
          </div>
        </td>

        <td className="hidden px-3 py-1.5 text-xs text-muted md:table-cell">
          {row.location_name ?? 'ບໍ່ລະບຸ'}
        </td>

        <td className="px-3 py-1.5 whitespace-nowrap">
          {row.stock_state ? (
            <>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STOCK_STYLE[row.stock_state]}`}
              >
                {STOCK_LABEL_LO[row.stock_state]}
              </span>
              {row.location_note && (
                <div className="mt-0.5 text-[11px] text-muted">
                  {row.location_note}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-faint">ຍັງບໍ່ໄດ້ກວດ</span>
          )}
        </td>

        <td className="hidden px-3 py-1.5 text-xs whitespace-nowrap text-muted lg:table-cell">
          {row.checked_at ? (
            <>
              {safeDate(row.checked_at)}
              <div className="text-[11px] text-faint">{row.checked_by_name}</div>
            </>
          ) : (
            '—'
          )}
        </td>

        <td className="px-3 py-1.5 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn-secondary rounded-lg px-3 py-1.5 text-xs"
          >
            {open ? 'ຍົກເລີກ' : row.stock_state ? 'ແກ້ໄຂ' : '✓ ໝາຍສະຖານະ'}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={5} className="bg-brand-blue/5 px-4 py-3">
            <ActionForm
              action={markStock}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="asset_code" value={row.asset_code} />

              <label className="flex flex-col gap-1 text-xs text-muted">
                ສະຖານະຈິງ
                <select
                  name="stock_state"
                  defaultValue={row.stock_state ?? 'in_stock'}
                  className="input w-40 rounded-lg px-3 py-1.5 text-sm"
                >
                  {STOCK_STATES.map((s) => (
                    <option key={s} value={s}>
                      {STOCK_LABEL_LO[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-muted">
                ຢູ່ບ່ອນໃດ / ກັບໃຜ
                <input
                  name="location_note"
                  defaultValue={row.location_note ?? ''}
                  placeholder="ຫ້ອງ IT ຊັ້ນ 2 / ຢູ່ກັບ ທ. ສົມສັກ"
                  className="input w-64 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-muted">
                ໝາຍເຫດ
                <input
                  name="note"
                  defaultValue={row.note ?? ''}
                  className="input w-56 rounded-lg px-3 py-1.5 text-sm"
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
