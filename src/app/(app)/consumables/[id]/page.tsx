import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getConsumable, getConsumableMoves } from '@/lib/consumables/queries'
import { getVendorOptions } from '@/lib/vendors/queries'
import { getEmployeeOptions } from '@/lib/accounts/queries'
import {
  CONSUMABLE_CATEGORY_LABEL_LO,
  MOVE_KIND_LABEL_LO,
  MOVE_KIND_STYLE,
  STOCK_STATE_LABEL_LO,
  STOCK_STATE_STYLE,
  formatQty,
} from '@/lib/consumables/model'
import { formatMoney, safeDate } from '@/lib/assets/model'
import { todayISO } from '@/lib/format'
import ConsumableForm from '../consumable-form'
import MovePanel from './move-panel'

export default async function ConsumablePage({
  params,
}: PageProps<'/consumables/[id]'>) {
  const { id } = await params
  const user = await requireMenuView('/consumables')

  const item = await getConsumable(id)
  if (!item) notFound()

  const editable = can.manageAssets(user)
  const [moves, vendors, employees] = await Promise.all([
    getConsumableMoves(id),
    editable ? getVendorOptions() : Promise.resolve([]),
    editable ? getEmployeeOptions() : Promise.resolve([]),
  ])

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{item.code}</p>
      <h1 className="mt-1 text-xl font-semibold text-fg">{item.name}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STOCK_STATE_STYLE[item.stock_state]}`}
        >
          {STOCK_STATE_LABEL_LO[item.stock_state]}
        </span>
        <span className="text-sm text-muted">
          {CONSUMABLE_CATEGORY_LABEL_LO[item.category]}
          {item.location && ` · ${item.location}`}
        </span>
      </div>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ຄົງເຫຼືອ" value={`${formatQty(item.on_hand)} ${item.unit}`} />
        <Info label="ຈຸດສັ່ງຊື້" value={`${formatQty(item.min_qty)} ${item.unit}`} />
        <Info
          label="ລາຄາຕໍ່ຫົວໜ່ວຍ"
          value={item.unit_price ? `${formatMoney(item.unit_price)} ກີບ` : '—'}
        />
        <Info label="ມູນຄ່າໃນສາງ" value={`${formatMoney(item.stock_value)} ກີບ`} />
        <Info label="ຮັບເຂົ້າລວມ" value={`${formatQty(item.in_qty)} ${item.unit}`} />
        <Info label="ເບີກອອກລວມ" value={`${formatQty(item.out_qty)} ${item.unit}`} />
        <Info label="ຜູ້ຂາຍ" value={item.vendor_name ?? '—'} />
        <Info
          label="ເຄື່ອນໄຫວຫຼ້າສຸດ"
          value={item.last_move_at ? safeDate(item.last_move_at) : '—'}
        />
      </div>

      {editable && (
        <MovePanel item={item} employees={employees} today={todayISO()} />
      )}

      <div className="glass-card mt-4 rounded-xl">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
          ປະຫວັດການເຄື່ອນໄຫວ
        </h2>
        <div className="divide-line divide-y">
          {moves.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-24 text-xs text-muted">{safeDate(m.moved_at)}</span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${MOVE_KIND_STYLE[m.kind]}`}
              >
                {MOVE_KIND_LABEL_LO[m.kind]}
              </span>
              <span className="min-w-0 flex-1 text-xs text-muted">
                {m.employee_name ?? m.department_name ?? '—'}
                {m.asset_code && ` · ${m.asset_code}`}
                {m.ref_no && ` · ${m.ref_no}`}
                {m.note && <span className="block text-body">{m.note}</span>}
              </span>
              <span className="text-sm text-body">
                {m.kind === 'out' ? '−' : '+'}
                {formatQty(m.qty)} {m.unit}
              </span>
              <span className="text-xs text-faint">{m.created_by_name}</span>
            </div>
          ))}
          {moves.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              ຍັງບໍ່ມີການເຄື່ອນໄຫວ
            </p>
          )}
        </div>
      </div>

      {editable && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-fg">ແກ້ຂໍ້ມູນລາຍການ</h2>
          <ConsumableForm vendors={vendors} item={item} />
        </>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-body">{value}</p>
    </div>
  )
}
