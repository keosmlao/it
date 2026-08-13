'use client'

import Link from 'next/link'
import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  STOCK_LABEL_LO,
  STOCK_STYLE,
  WRITEOFF_REASONS,
  WRITEOFF_REASON_LO,
  type StockState,
  type WriteoffReason,
} from '@/lib/assets/stock-model'
import { todayISO } from '@/lib/format'
import {
  cancelWriteOff,
  deployAsset,
  markDamaged,
  undeployAsset,
  writeOffAsset,
} from '../condition-actions'

type Employee = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  department_name_lo: string | null
}

export type ConditionProps = {
  assetCode: string
  stockState: StockState | null
  damageDetail: string | null
  damagedAt: string
  checkedAt: string
  checkedByName: string | null
  writeoffReason: WriteoffReason | null
  writtenOffAt: string
  decidedByName: string | null
  repairCount: number
  repairCost: string
  purchasePrice: string
  /** ຕິດຕັ້ງໃຊ້ສ່ວນກາງຢູ່ບ່ອນໃດ (ຖ້າມີ) */
  deployedPlace: string | null
  deployedPurpose: string | null
  deployedSince: string
  responsibleName: string | null
  /** ຍັງມີຜູ້ຖືເປັນຄົນຢູ່ບໍ — ຖ້າມີ ຈະຕິດຕັ້ງ/ຕັດຈຳໜ່າຍບໍ່ໄດ້ */
  isAssigned: boolean
  canWriteOff: boolean
  employees: Employee[]
  locations: { code: string; name: string }[]
}

const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'

/**
 * ກ່ອງ "ສະພາບເຄື່ອງ" ຢູ່ໜ້າລາຍລະອຽດ — ບ່ອນດຽວທີ່ໝາຍໄດ້ວ່າ
 * ເພ / ສົ່ງສ້ອມ / ຫາຍ / ຕັດຈຳໜ່າຍ ຫຼື ຕິດຕັ້ງໃຊ້ສ່ວນກາງ
 */
export default function ConditionPanel(props: ConditionProps) {
  const [panel, setPanel] = useState<
    'none' | 'state' | 'writeoff' | 'cancel' | 'deploy' | 'undeploy'
  >('none')

  const state = props.stockState
  const scrapped = state === 'scrapped' || state === 'retired'
  const broken = state === 'damaged' || state === 'repair' || state === 'missing'
  const deployed = Boolean(props.deployedPlace)
  const toggle = (name: typeof panel) => setPanel(panel === name ? 'none' : name)

  return (
    <section className="glass-card rounded-xl p-5">
      <h2 className="font-semibold text-fg">ສະພາບເຄື່ອງ</h2>

      {/* ---------- ສະຖານະປັດຈຸບັນ ---------- */}
      <div className="mt-3">
        {state ? (
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STOCK_STYLE[state]}`}
          >
            {STOCK_LABEL_LO[state]}
          </span>
        ) : (
          <span className="text-sm text-muted">ຍັງບໍ່ເຄີຍໝາຍສະຖານະ</span>
        )}

        {props.damageDetail && (
          <p className="mt-2 text-sm text-body">{props.damageDetail}</p>
        )}
        {broken && props.damagedAt !== '—' && (
          <p className="text-xs text-muted">
            ພົບເມື່ອ {props.damagedAt}
            {props.checkedByName && ` · ${props.checkedByName}`}
          </p>
        )}
        {scrapped && props.writeoffReason && (
          <p className="mt-1 text-xs text-muted">
            ຕັດຈຳໜ່າຍ {props.writtenOffAt} ·{' '}
            {WRITEOFF_REASON_LO[props.writeoffReason]}
            {props.decidedByName && ` · ໂດຍ ${props.decidedByName}`}
          </p>
        )}
        {props.repairCount > 0 && (
          <p className="mt-1 text-xs text-faint">
            ສ້ອມມາແລ້ວ {props.repairCount} ຄັ້ງ · ຄ່າສ້ອມລວມ {props.repairCost} ກີບ
          </p>
        )}
      </div>

      {/* ---------- ຕິດຕັ້ງໃຊ້ສ່ວນກາງ ---------- */}
      {deployed && (
        <div className="mt-3 rounded-lg bg-brand-blue/5 px-3 py-2.5">
          <p className="text-xs font-medium text-body">
            📍 ຕິດຕັ້ງໃຊ້ສ່ວນກາງ: {props.deployedPlace}
          </p>
          {props.deployedPurpose && (
            <p className="text-xs text-muted">{props.deployedPurpose}</p>
          )}
          <p className="text-[11px] text-faint">
            ຕັ້ງແຕ່ {props.deployedSince}
            {props.responsibleName && ` · ຜູ້ຮັບຜິດຊອບ ${props.responsibleName}`}
          </p>
        </div>
      )}

      {/* ---------- ປຸ່ມ ---------- */}
      <div className="mt-3 flex flex-wrap gap-2">
        {!scrapped && (
          <button
            type="button"
            onClick={() => toggle('state')}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            {broken ? 'ປ່ຽນສະຖານະ' : '⚠ ໝາຍວ່າເພ / ຫາຍ'}
          </button>
        )}

        {!scrapped && !deployed && !props.isAssigned && (
          <button
            type="button"
            onClick={() => toggle('deploy')}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            📍 ຕິດຕັ້ງໃຊ້ສ່ວນກາງ
          </button>
        )}

        {deployed && (
          <button
            type="button"
            onClick={() => toggle('undeploy')}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            ຖອດອອກ
          </button>
        )}

        {!scrapped && props.canWriteOff && !props.isAssigned && !deployed && (
          <button
            type="button"
            onClick={() => toggle('writeoff')}
            className="btn-danger rounded-lg px-3 py-1.5 text-sm"
          >
            ຕັດຈຳໜ່າຍ
          </button>
        )}

        {scrapped && props.canWriteOff && (
          <button
            type="button"
            onClick={() => toggle('cancel')}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            ຍົກເລີກການຕັດຈຳໜ່າຍ
          </button>
        )}
      </div>

      {(props.isAssigned || deployed) && !scrapped && props.canWriteOff && (
        <p className="mt-2 text-[11px] text-faint">
          {props.isAssigned
            ? 'ຕັດຈຳໜ່າຍບໍ່ໄດ້ຈົນກວ່າຈະບັນທຶກການຄືນ'
            : 'ຕັດຈຳໜ່າຍບໍ່ໄດ້ຈົນກວ່າຈະຖອດອອກຈາກບ່ອນຕິດຕັ້ງ'}
        </p>
      )}

      {/* ---------- ຟອມ ---------- */}
      {panel === 'state' && (
        <ActionForm action={markDamaged} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="asset_code" value={props.assetCode} />

          <label className="block text-xs text-muted">
            ສະຖານະ
            <select
              name="stock_state"
              defaultValue={broken ? state! : 'damaged'}
              className={field}
            >
              <option value="damaged">ເພ (ຍັງສ້ອມໄດ້)</option>
              <option value="repair">ສົ່ງສ້ອມຢູ່</option>
              <option value="missing">ຫາບໍ່ພົບ</option>
              <option value="in_stock">ປົກກະຕິ — ຢູ່ໃນສາງ</option>
            </select>
          </label>

          <label className="mt-3 block text-xs text-muted">
            ອາການ / ລາຍລະອຽດ
            <input
              name="damage_detail"
              defaultValue={props.damageDetail ?? ''}
              placeholder="ຈໍແຕກ, ເປີດບໍ່ຕິດ, ແປ້ນພິມເສຍ"
              className={field}
            />
          </label>

          <label className="mt-3 block text-xs text-muted">
            ພົບເມື່ອ
            <input
              type="date"
              name="damaged_at"
              defaultValue={todayISO()}
              className={field}
            />
          </label>

          <div className="mt-3 flex gap-2">
            <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
              ບັນທຶກ
            </SubmitButton>
            <Cancel onClick={() => setPanel('none')} />
          </div>
        </ActionForm>
      )}

      {panel === 'writeoff' && (
        <ActionForm action={writeOffAsset} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="asset_code" value={props.assetCode} />

          <label className="block text-xs text-muted">
            ເຫດຜົນ
            <select name="reason" defaultValue="beyond_repair" className={field}>
              {WRITEOFF_REASONS.map((r) => (
                <option key={r} value={r}>
                  {WRITEOFF_REASON_LO[r]}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-xs text-muted">
            ອະທິບາຍລະອຽດ *
            <input
              name="detail"
              required
              defaultValue={props.damageDetail ?? ''}
              placeholder="ສ້ອມ 3 ຄັ້ງແລ້ວຍັງເສຍ ອາໄຫຼ່ບໍ່ມີຂາຍແລ້ວ"
              className={field}
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              ວັນທີຕັດຈຳໜ່າຍ
              <input
                type="date"
                name="written_off_at"
                defaultValue={todayISO()}
                className={field}
              />
            </label>
            <label className="block text-xs text-muted">
              ມູນຄ່າຄົງເຫຼືອ
              <input name="book_value" inputMode="numeric" placeholder="0" className={field} />
            </label>
          </div>

          <p className="mt-2 text-[11px] text-faint">
            ລາຄາຊື້ {props.purchasePrice} ກີບ · ສ້ອມມາແລ້ວ {props.repairCount} ຄັ້ງ (
            {props.repairCost} ກີບ)
          </p>

          <div className="mt-3 flex gap-2">
            <SubmitButton
              pendingLabel="ກຳລັງບັນທຶກ…"
              className="btn-danger rounded-lg px-4 py-2 text-sm font-medium"
            >
              ຢືນຢັນຕັດຈຳໜ່າຍ
            </SubmitButton>
            <Cancel onClick={() => setPanel('none')} />
          </div>
        </ActionForm>
      )}

      {panel === 'cancel' && (
        <ActionForm action={cancelWriteOff} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="asset_code" value={props.assetCode} />
          <label className="block text-xs text-muted">
            ເຫດຜົນທີ່ຍົກເລີກ *
            <input
              name="cancel_note"
              required
              placeholder="ພົບເຄື່ອງຄືນ / ຕັດສິນຜິດ"
              className={field}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
              ຍົກເລີກ ແລະ ກັບເຂົ້າສາງ
            </SubmitButton>
            <Cancel onClick={() => setPanel('none')} />
          </div>
        </ActionForm>
      )}

      {panel === 'deploy' && (
        <ActionForm action={deployAsset} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="asset_code" value={props.assetCode} />

          <label className="block text-xs text-muted">
            ບ່ອນຕິດຕັ້ງ *
            <input
              name="place"
              required
              placeholder="ຫ້ອງປະຊຸມໃຫຍ່ ຊັ້ນ 3"
              className={field}
            />
          </label>

          <label className="mt-3 block text-xs text-muted">
            ໃຊ້ເຮັດຫຍັງ
            <input name="purpose" placeholder="ກະຈາຍສັນຍານເນັດຊັ້ນ 3" className={field} />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              ສະຖານທີ່ຕາມທະບຽນ
              <select name="location_code" defaultValue="" className={field}>
                <option value="">— ບໍ່ລະບຸ —</option>
                {props.locations.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted">
              ວັນທີຕິດຕັ້ງ
              <input
                type="date"
                name="installed_at"
                defaultValue={todayISO()}
                className={field}
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-muted">
            ຜູ້ຮັບຜິດຊອບ
            <select name="responsible_emp_code" defaultValue="" className={field}>
              <option value="">— ບໍ່ລະບຸ —</option>
              {props.employees.map((e) => (
                <option key={e.employee_id} value={e.employee_code}>
                  {e.fullname_lo} ({e.department_name_lo ?? '—'})
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex gap-2">
            <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
              ບັນທຶກການຕິດຕັ້ງ
            </SubmitButton>
            <Cancel onClick={() => setPanel('none')} />
          </div>
        </ActionForm>
      )}

      {panel === 'undeploy' && (
        <ActionForm action={undeployAsset} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="asset_code" value={props.assetCode} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              ວັນທີຖອດ
              <input
                type="date"
                name="removed_at"
                defaultValue={todayISO()}
                className={field}
              />
            </label>
            <label className="block text-xs text-muted">
              ເຫດຜົນ
              <input name="remove_note" placeholder="ຍ້າຍໄປຊັ້ນ 4" className={field} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <SubmitButton className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
              ຢືນຢັນຖອດອອກ
            </SubmitButton>
            <Cancel onClick={() => setPanel('none')} />
          </div>
        </ActionForm>
      )}

      {(broken || scrapped) && (
        <Link
          href="/assets/damaged"
          className="mt-3 inline-block text-xs text-brand-blue hover:underline"
        >
          ເບິ່ງລາຍການອຸປະກອນເພທັງໝົດ →
        </Link>
      )}
    </section>
  )
}

function Cancel({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-secondary rounded-lg px-4 py-2 text-sm"
    >
      ຍົກເລີກ
    </button>
  )
}
