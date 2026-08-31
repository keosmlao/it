'use client'

import Link from 'next/link'
import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  WRITEOFF_REASONS,
  WRITEOFF_REASON_LO,
  type StockState,
} from '@/lib/assets/stock-model'
import { todayISO } from '@/lib/format'
import { cancelWriteOff, markDamaged, writeOffAsset } from '../condition-actions'

type Row = {
  asset_code: string
  asset_name: string
  serial_no: string | null
  stock_state: StockState
  state_label: string
  state_style: string
  damage_detail: string | null
  damaged_at: string
  checked_by_name: string | null
  repair_count: number
  repair_cost: string
  purchase_price: string
  writeoff_reason: string | null
  written_off_at: string
  decided_by_name: string | null
}

/** ແຖວອຸປະກອນທີ່ມີບັນຫາ — ກົດແລ້ວປ່ຽນສະຖານະ ຫຼື ຕັດຈຳໜ່າຍ */
export default function DamageRow({
  row,
  canWriteOff,
}: {
  row: Row
  canWriteOff: boolean
}) {
  const [panel, setPanel] = useState<'none' | 'state' | 'writeoff' | 'cancel'>('none')
  const scrapped = row.stock_state === 'scrapped' || row.stock_state === 'retired'

  return (
    <>
      <tr className="hover-surface transition">
        <td className="px-2 py-1.5 sm:px-4">
          <Link
            href={`/assets/${encodeURIComponent(row.asset_code)}`}
            className="text-fg underline-offset-2 hover:underline"
          >
            {row.asset_name}
          </Link>
          <div className="font-mono text-xs text-muted">
            {row.asset_code}
            {row.serial_no && ` · ${row.serial_no}`}
          </div>
          {/* ຖັນທີ່ເຊື່ອງຢູ່ຈໍນ້ອຍ — ຍ້າຍລົງມາຢູ່ນີ້ແທນ */}
          <div className="text-xs text-muted md:hidden">
            {row.damage_detail ?? '—'}
            <span className="lg:hidden">
              {' '}
              · {scrapped ? row.written_off_at : row.damaged_at}
            </span>
          </div>
        </td>

        <td className="px-2 py-1.5 whitespace-nowrap sm:px-4">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.state_style}`}
          >
            {row.state_label}
          </span>
        </td>

        <td className="hidden px-3 py-1.5 md:table-cell">
          <p className="text-body">{row.damage_detail ?? '—'}</p>
          {row.writeoff_reason && (
            <p className="text-xs text-muted">
              ຕັດຈຳໜ່າຍ: {row.writeoff_reason}
              {row.decided_by_name && ` · ໂດຍ ${row.decided_by_name}`}
            </p>
          )}
        </td>

        <td className="hidden px-3 py-1.5 text-xs whitespace-nowrap text-muted lg:table-cell">
          {scrapped ? row.written_off_at : row.damaged_at}
          {row.checked_by_name && (
            <div className="text-[11px] text-faint">{row.checked_by_name}</div>
          )}
        </td>

        <td className="hidden px-3 py-1.5 text-right text-xs whitespace-nowrap text-muted lg:table-cell">
          {row.repair_count > 0 ? (
            <>
              {row.repair_count} ຄັ້ງ
              <div className="text-[11px] text-faint">{row.repair_cost} ກີບ</div>
            </>
          ) : (
            '—'
          )}
        </td>

        <td className="px-2 py-1.5 text-right whitespace-nowrap sm:px-4">
          {/* ຢູ່ມືຖືວາງປຸ່ມຊ້ອນກັນ — ຮຽງແຖວດຽວແລ້ວຕາຕະລາງກວ້າງເກີນຈໍ */}
          <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:justify-end sm:gap-2">
            {!scrapped && (
              <button
                type="button"
                onClick={() => setPanel(panel === 'state' ? 'none' : 'state')}
                className="btn-secondary rounded px-3 py-1.5 text-xs"
              >
                ປ່ຽນສະຖານະ
              </button>
            )}
            {!scrapped && canWriteOff && (
              <button
                type="button"
                onClick={() => setPanel(panel === 'writeoff' ? 'none' : 'writeoff')}
                className="btn-danger rounded px-3 py-1.5 text-xs"
              >
                ຕັດຈຳໜ່າຍ
              </button>
            )}
            {scrapped && canWriteOff && (
              <button
                type="button"
                onClick={() => setPanel(panel === 'cancel' ? 'none' : 'cancel')}
                className="btn-secondary rounded px-3 py-1.5 text-xs"
              >
                ຍົກເລີກການຕັດຈຳໜ່າຍ
              </button>
            )}
          </div>
        </td>
      </tr>

      {panel !== 'none' && (
        <tr>
          <td colSpan={6} className="bg-brand-blue/5 px-4 py-3">
            {panel === 'state' && (
              <ActionForm action={markDamaged} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="asset_code" value={row.asset_code} />
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ສະຖານະ
                  <select
                    name="stock_state"
                    defaultValue={row.stock_state}
                    className="input w-44 rounded px-2 py-1 text-[13px]"
                  >
                    <option value="damaged">ເພ (ຍັງສ້ອມໄດ້)</option>
                    <option value="repair">ສົ່ງສ້ອມຢູ່</option>
                    <option value="missing">ຫາບໍ່ພົບ</option>
                    <option value="in_stock">ສ້ອມແລ້ວ — ກັບເຂົ້າສາງ</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ອາການ / ລາຍລະອຽດ
                  <input
                    name="damage_detail"
                    defaultValue={row.damage_detail ?? ''}
                    placeholder="ຈໍແຕກ, ເປີດບໍ່ຕິດ, ແປ້ນພິມເສຍ"
                    className="input w-72 rounded px-2 py-1 text-[13px]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ພົບເມື່ອ
                  <input
                    type="date"
                    name="damaged_at"
                    defaultValue={todayISO()}
                    className="input w-40 rounded px-2 py-1 text-[13px]"
                  />
                </label>
                <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
                  ບັນທຶກ
                </SubmitButton>
              </ActionForm>
            )}

            {panel === 'writeoff' && (
              <ActionForm action={writeOffAsset} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="asset_code" value={row.asset_code} />
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ເຫດຜົນ
                  <select
                    name="reason"
                    defaultValue="beyond_repair"
                    className="input w-52 rounded px-2 py-1 text-[13px]"
                  >
                    {WRITEOFF_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {WRITEOFF_REASON_LO[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ອະທິບາຍລະອຽດ *
                  <input
                    name="detail"
                    required
                    defaultValue={row.damage_detail ?? ''}
                    placeholder="ສ້ອມ 3 ຄັ້ງແລ້ວຍັງເສຍ ອາໄຫຼ່ບໍ່ມີຂາຍແລ້ວ"
                    className="input w-80 rounded px-2 py-1 text-[13px]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ວັນທີຕັດຈຳໜ່າຍ
                  <input
                    type="date"
                    name="written_off_at"
                    defaultValue={todayISO()}
                    className="input w-40 rounded px-2 py-1 text-[13px]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ມູນຄ່າຄົງເຫຼືອ
                  <input
                    name="book_value"
                    inputMode="numeric"
                    placeholder="0"
                    className="input w-32 rounded px-2 py-1 text-[13px]"
                  />
                </label>
                <SubmitButton
                  pendingLabel="ກຳລັງບັນທຶກ…"
                  className="btn-danger rounded px-3 py-1.5 text-[13px] font-medium"
                >
                  ຢືນຢັນຕັດຈຳໜ່າຍ
                </SubmitButton>
                <p className="w-full text-[11px] text-faint">
                  ລາຄາຊື້ {row.purchase_price} ກີບ · ສ້ອມມາແລ້ວ {row.repair_count} ຄັ້ງ
                  ({row.repair_cost} ກີບ)
                </p>
              </ActionForm>
            )}

            {panel === 'cancel' && (
              <ActionForm action={cancelWriteOff} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="asset_code" value={row.asset_code} />
                <label className="flex flex-col gap-1 text-xs text-muted">
                  ເຫດຜົນທີ່ຍົກເລີກ *
                  <input
                    name="cancel_note"
                    required
                    placeholder="ພົບເຄື່ອງຄືນ / ຕັດສິນຜິດ"
                    className="input w-80 rounded px-2 py-1 text-[13px]"
                  />
                </label>
                <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
                  ຍົກເລີກ ແລະ ກັບເຂົ້າສາງ
                </SubmitButton>
              </ActionForm>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
