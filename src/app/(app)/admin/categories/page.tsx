import ActionForm from '@/components/action-form'
import { query } from '@/lib/db'
import { requireMenuView } from '@/lib/auth/session'
import { Panel } from '../panel'
import { saveTicketCategory, toggleCategory } from '../actions'

export const metadata = { title: 'ປະເພດບັນຫາ' }

const UNIT_LABEL: Record<string, string> = {
  '8010': 'Support',
  '8011': 'ພັດທະນາລະບົບ',
}

/** ປະເພດ ticket — ຕົວກຳນົດວ່າໜ່ວຍງານໃດຮັບຜິດຊອບ */
export default async function CategoriesPage() {
  await requireMenuView('/admin/categories')

  const categories = await query<{
    code: string
    name_lo: string
    unit_code: string | null
    sort_order: number
    is_active: boolean
  }>('select * from it.ticket_categories order by sort_order')

  return (
    <div className="w-full">
      <Panel
        title="ປະເພດບັນຫາ"
        hint="ປະເພດຈະກຳນົດໜ່ວຍງານທີ່ຮັບຜິດຊອບ ticket ໂດຍອັດຕະໂນມັດ"
      >
        <div className="o-list-wrap overflow-x-auto">
          <table className="o-list w-full min-w-[520px] text-[13px]">
            <thead>
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">ລະຫັດ</th>
                <th className="px-3 py-1.5 text-left font-medium">ຊື່</th>
                <th className="px-3 py-1.5 text-left font-medium">ໜ່ວຍງານ</th>
                <th className="px-3 py-1.5 text-left font-medium">ສະຖານະ</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((c) => (
                <tr key={c.code} className="hover-surface transition">
                  <td className="px-3 py-1.5 font-mono text-xs text-muted">
                    {c.code}
                  </td>
                  <td className="px-3 py-1.5 text-fg">{c.name_lo}</td>
                  <td className="px-3 py-1.5 text-muted">
                    {c.unit_code ? (UNIT_LABEL[c.unit_code] ?? c.unit_code) : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    {c.is_active ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ໃຊ້ງານ
                      </span>
                    ) : (
                      <span className="text-faint">ປິດ</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <ActionForm action={toggleCategory}>
                      <input type="hidden" name="code" value={c.code} />
                      <button
                        type="submit"
                        className="text-xs text-muted underline-offset-2 hover:underline"
                      >
                        {c.is_active ? 'ປິດ' : 'ເປີດ'}
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ActionForm
          action={saveTicketCategory}
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            ລະຫັດ
            <input
              name="code"
              required
              maxLength={20}
              placeholder="BACKUP"
              className="input w-32 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ຊື່
            <input
              name="name_lo"
              required
              maxLength={100}
              className="input w-52 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ໜ່ວຍງານ
            <select
              name="unit_code"
              defaultValue=""
              className="input rounded px-2 py-1 text-[13px]"
            >
              <option value="">— ບໍ່ລະບຸ —</option>
              <option value="8010">Support</option>
              <option value="8011">ພັດທະນາລະບົບ</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            ລຳດັບ
            <input
              type="number"
              name="sort_order"
              defaultValue={50}
              className="input w-20 rounded px-2 py-1 text-[13px]"
            />
          </label>
          <button
            type="submit"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            ເພີ່ມ / ອັບເດດ
          </button>
        </ActionForm>
      </Panel>
    </div>
  )
}
