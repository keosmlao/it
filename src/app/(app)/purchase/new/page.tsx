import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { createPurchaseRequest } from '../actions'

export const metadata = { title: 'ສ້າງໃບສະເໜີຊື້' }

export default async function NewPurchasePage() {
  const user = await requireUser()

  return (
    <div className="w-full max-w-3xl">
      <p className="text-sm text-muted">
        ຜູ້ສະເໜີ: {user.fullname_lo}
        {user.unit_name_lo && ` · ${user.unit_name_lo}`} · ບັນທຶກເປັນ{' '}
        <strong className="text-body">ຮ່າງ</strong> ກ່ອນ
        ແລ້ວຄ່ອຍເພີ່ມລາຍການ ແລະ ສົ່ງອະນຸມັດ
      </p>

      <ActionForm
        action={createPurchaseRequest}
        className="glass-card mt-5 space-y-4 rounded-xl p-5"
      >
        <label className="block">
          <span className="text-xs text-muted">ຫົວຂໍ້ *</span>
          <input
            name="title"
            required
            placeholder="ຈັດຊື້ໂນດບຸກທົດແທນເຄື່ອງເກົ່າ"
            className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">ເຫດຜົນ / ຄວາມຈຳເປັນ</span>
          <textarea
            name="purpose"
            rows={3}
            placeholder="ອະທິບາຍວ່າຈຳເປັນຍ້ອນຫຍັງ ໃຊ້ກັບວຽກໃດ"
            className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block max-w-48">
          <span className="text-xs text-muted">ຕ້ອງການໃຊ້ພາຍໃນວັນທີ</span>
          <input
            type="date"
            name="need_date"
            className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <fieldset className="rounded-lg border border-line p-4">
          <legend className="px-1 text-xs text-muted">ລາຍການທີ 1</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted">ຊື່ລາຍການ *</span>
              <input
                name="item_name"
                required
                placeholder="Notebook Lenovo ThinkPad E14"
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs text-muted">ສະເປັກ / ລາຍລະອຽດ</span>
              <textarea
                name="spec"
                rows={2}
                placeholder="i5-1335U / RAM 16GB / SSD 512GB"
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs text-muted">ລະຫັດສິນຄ້າ (ຖ້າມີ)</span>
              <input
                name="item_code"
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs text-muted">ຫົວໜ່ວຍ</span>
              <input
                name="unit"
                placeholder="ເຄື່ອງ"
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs text-muted">ຈຳນວນ *</span>
              <input
                type="number"
                name="qty"
                min="0.01"
                step="0.01"
                defaultValue={1}
                required
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs text-muted">ລາຄາປະມານ / ຫົວໜ່ວຍ (ກີບ)</span>
              <input
                name="est_price"
                inputMode="numeric"
                placeholder="12,000,000"
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs text-muted">ໝາຍເຫດລາຍການ</span>
              <input
                name="line_note"
                className="input mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <SubmitButton className="btn-primary rounded-lg px-5 py-2 text-sm font-medium">
            ບັນທຶກເປັນຮ່າງ
          </SubmitButton>
          <Link href="/purchase" className="text-sm text-muted hover:underline">
            ຍົກເລີກ
          </Link>
        </div>
      </ActionForm>
    </div>
  )
}
