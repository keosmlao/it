import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getCategories, getPriorities } from '@/lib/tickets/queries'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { reportIssue } from '../../actions'

export const metadata = { title: 'ແຈ້ງບັນຫາ' }

export default async function ReportIssuePage() {
  const user = await requireUser()
  const [categories, priorities] = await Promise.all([
    getCategories(),
    getPriorities(),
  ])

  return (
    <div>
      <Link href="/my" className="text-sm text-muted underline-offset-2 hover:underline">
        ← ກັບໜ້າຫຼັກ
      </Link>

      <h1 className="mt-2 text-lg font-semibold text-fg">ແຈ້ງບັນຫາ</h1>
      <p className="text-sm text-muted">
        ຜູ້ແຈ້ງ: {user.fullname_lo}
        {user.department_name && ` · ${user.department_name}`}
      </p>

      <ActionForm
        action={reportIssue}
        className="glass-card mt-4 space-y-4 rounded-xl p-5"
      >
        <label className="block">
          <span className="text-xs text-muted">ບັນຫາເລື່ອງຫຍັງ *</span>
          <input
            name="title"
            required
            placeholder="ເຄື່ອງພິມຫ້ອງບັນຊີພິມບໍ່ອອກ"
            className="input mt-1 w-full rounded px-2 py-1 text-[13px]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted">ປະເພດ *</span>
            <select
              name="category_code"
              required
              className="input mt-1 w-full rounded px-2 py-1 text-[13px]"
            >
              <option value="">— ເລືອກ —</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name_lo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-muted">ດ່ວນປານໃດ</span>
            <select
              name="priority"
              defaultValue={priorities[1]?.priority ?? priorities[0]?.priority}
              className="input mt-1 w-full rounded px-2 py-1 text-[13px]"
            >
              {priorities.map((p) => (
                <option key={p.priority} value={p.priority}>
                  {p.name_lo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-muted">ອະທິບາຍລະອຽດ</span>
          <textarea
            name="description"
            rows={4}
            placeholder="ເກີດຫຍັງຂຶ້ນ, ເລີ່ມເມື່ອໃດ, ມີຂໍ້ຄວາມຜິດພາດຫຍັງຂຶ້ນບໍ"
            className="input mt-1 w-full rounded px-2 py-1 text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">ແນບຮູບ (ຖ່າຍໜ້າຈໍ ຫຼື ຮູບເຄື່ອງ)</span>
          <input
            type="file"
            name="images"
            multiple
            accept="image/*"
            className="input mt-1 w-full rounded px-2 py-1 text-[13px]"
          />
          <span className="mt-1 block text-xs text-faint">
            ຮູບຊ່ວຍໃຫ້ທີມໄອທີເຂົ້າໃຈບັນຫາໄວຂຶ້ນຫຼາຍ
          </span>
        </label>

        <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
          ສົ່ງແຈ້ງບັນຫາ
        </SubmitButton>
      </ActionForm>
    </div>
  )
}
