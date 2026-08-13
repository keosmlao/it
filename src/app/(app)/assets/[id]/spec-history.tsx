import { formatDateTime } from '@/lib/format'
import type { SpecChange } from '@/lib/assets/queries'

/** ຊື່ຊ່ອງເປັນພາສາລາວ — ຄີກົງກັບຊື່ຄໍລຳໃນ it.asset_specs */
const FIELD_LABEL: Record<string, string> = {
  cpu: 'CPU',
  ram: 'RAM',
  storage: 'ດິສກ໌',
  gpu: 'ກາດຈໍ',
  os: 'ລະບົບປະຕິບັດການ',
  screen: 'ໜ້າຈໍ',
  spec_note: 'ໝາຍເຫດ spec',
  purchase_date: 'ວັນທີຊື້',
  purchase_price: 'ລາຄາຊື້',
  warranty_until: 'ວັນໝົດປະກັນ',
  warranty_note: 'ໝາຍເຫດປະກັນ',
}

type Edit = {
  key: string
  at: string | Date
  by: string
  changes: SpecChange[]
}

/**
 * ການບັນທຶກຄັ້ງດຽວປ່ຽນໄດ້ຫຼາຍຊ່ອງ ແລະ trigger ຂຽນແຍກແຖວ —
 * ຈຶ່ງຈັດກຸ່ມຄືນຕາມ (ເວລາ, ຜູ້ແກ້) ໃຫ້ອ່ານເປັນ "ຄັ້ງທີ່ແກ້" ບໍ່ແມ່ນ 11 ແຖວ
 */
function groupEdits(rows: SpecChange[]): Edit[] {
  const edits: Edit[] = []

  for (const row of rows) {
    const at = row.changed_at instanceof Date ? row.changed_at.toISOString() : row.changed_at
    const by = row.changed_by_nickname || row.changed_by_name || 'ບໍ່ຮູ້ຜູ້ແກ້'
    const key = `${at}|${by}`
    const last = edits[edits.length - 1]

    if (last && last.key === key) last.changes.push(row)
    else edits.push({ key, at: row.changed_at, by, changes: [row] })
  }

  return edits
}

function Value({ text, muted }: { text: string | null; muted?: boolean }) {
  if (!text) {
    return <span className="text-faint italic">ຫວ່າງ</span>
  }
  return (
    <span className={muted ? 'text-muted line-through' : 'font-medium text-fg'}>
      {text}
    </span>
  )
}

export default function SpecHistory({ rows }: { rows: SpecChange[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-faint">
        ຍັງບໍ່ມີການແກ້ໄຂ — ບັນທຶກຄັ້ງຕໍ່ໄປຈະຂຶ້ນຢູ່ນີ້
      </p>
    )
  }

  const edits = groupEdits(rows)

  return (
    <ol className="mt-4 space-y-4">
      {edits.map((edit) => (
        <li key={edit.key} className="border-l-2 border-line pl-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-fg">{edit.by}</span>
            <span className="text-xs text-muted">{formatDateTime(edit.at)}</span>
            <span className="text-xs text-faint">
              ປ່ຽນ {edit.changes.length} ຊ່ອງ
            </span>
          </div>

          <ul className="mt-2 space-y-1">
            {edit.changes.map((change) => (
              <li key={change.id} className="text-sm">
                <span className="text-muted">
                  {FIELD_LABEL[change.field] ?? change.field}:
                </span>{' '}
                <Value text={change.old_value} muted />
                <span className="mx-1.5 text-faint">→</span>
                <Value text={change.new_value} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
