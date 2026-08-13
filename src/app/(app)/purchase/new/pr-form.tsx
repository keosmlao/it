'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { EMPTY_STATE } from '@/lib/action-state'
import { CURRENCIES, amountInWords } from '@/lib/purchase/model'
import { createPurchaseRequest } from '../actions'

type Line = {
  key: number
  item_code: string
  item_name: string
  spec: string
  unit: string
  qty: string
  est_price: string
  discount: string
  note: string
}

type InventoryItem = {
  code: string
  name: string
  unit_name: string | null
  avg_cost: string
  stock_qty: string
  category_name: string | null
}

export type Supplier = { code: string; name: string }

const blank = (key: number): Line => ({
  key,
  item_code: '',
  item_name: '',
  spec: '',
  unit: '',
  qty: '1',
  est_price: '',
  discount: '',
  note: '',
})

const num = (v: string) => Number(String(v).replace(/,/g, '')) || 0
const money = (n: number) => n.toLocaleString('lo-LA', { maximumFractionDigits: 2 })

const cell = 'input w-full rounded-md px-2 py-1.5 text-sm'
const field = 'input mt-1 w-full rounded-lg px-3 py-2 text-sm'

/**
 * ໃບສະເໜີຂໍຊື້ — ຈັດວາງແບບເອກະສານຂອງ SML:
 * ຫົວບິນ (ຜູ້ຈຳໜ່າຍ / ວັນທີ / ອ້າງອີງ) → ຕາຕະລາງລາຍການ → ທ້າຍບິນ
 * (ລວມກ່ອນຫຼຸດ → ສ່ວນຫຼຸດ → ຫຼັງຫຼຸດ → ພາສີ → ລວມທັງສິ້ນ → ຕົວໜັງສື)
 *
 * ລາຍການສິນຄ້າຄົ້ນຫາຈາກ ic_inventory ໂດຍກົງ ບໍ່ຕ້ອງພິມຊື່ເອງ
 */
export default function PurchaseRequestForm({
  requester,
  department,
  steps,
  suppliers,
}: {
  requester: string
  department: string
  steps: string[]
  suppliers: Supplier[]
}) {
  const [state, formAction] = useActionState(createPurchaseRequest, EMPTY_STATE)
  const [lines, setLines] = useState<Line[]>([blank(1), blank(2), blank(3)])
  const [nextKey, setNextKey] = useState(4)
  const [currency, setCurrency] = useState('LAK')
  const [discount, setDiscount] = useState('')
  const [vatRate, setVatRate] = useState('0')

  const update = (key: number, patch: Partial<Line>) =>
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const addLine = () => {
    setLines((rows) => [...rows, blank(nextKey)])
    setNextKey((k) => k + 1)
  }

  const removeLine = (key: number) =>
    setLines((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows))

  const lineGross = (l: Line) => num(l.qty) * num(l.est_price)
  const lineTotal = (l: Line) => lineGross(l) - num(l.discount)

  const filled = lines.filter((l) => l.item_name.trim())
  const beforeDiscount = filled.reduce((s, l) => s + lineTotal(l), 0)
  const afterDiscount = beforeDiscount - num(discount)
  const vat = Math.round(afterDiscount * (num(vatRate) / 100) * 100) / 100
  const grand = afterDiscount + vat

  return (
    <form action={formAction} className="w-full">
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          filled.map((l) => ({
            item_code: l.item_code.trim() || null,
            item_name: l.item_name.trim(),
            spec: l.spec.trim() || null,
            unit: l.unit.trim() || null,
            qty: num(l.qty),
            est_price: l.est_price ? num(l.est_price) : null,
            discount: num(l.discount),
            note: l.note.trim() || null,
          }))
        )}
      />

      {/* ---------- ຫົວບິນ ---------- */}
      <section className="glass-card overflow-hidden rounded-2xl">
        <header className="brand-gradient-cool flex flex-wrap items-end justify-between gap-3 px-6 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-80">
              ODIEN Group
            </p>
            <h1 className="mt-0.5 text-xl font-bold">ໃບສະເໜີຂໍຊື້ / Purchase Requisition</h1>
          </div>
          <p className="text-xs opacity-85">
            ເລກທີ່ອອກໃຫ້ອັດຕະໂນມັດຕອນບັນທຶກ
          </p>
        </header>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
          <div className="rounded-lg bg-brand-blue/5 px-3 py-2">
            <p className="text-[11px] text-muted">ຜູ້ສະເໜີ</p>
            <p className="text-sm text-fg">{requester}</p>
            <p className="text-[11px] text-muted">{department}</p>
          </div>

          <label className="block">
            <span className="text-xs text-muted">ຜູ້ຈຳໜ່າຍທີ່ສະເໜີ</span>
            <input
              name="supplier_code"
              list="supplier-list"
              placeholder="ພິມຊື່ ຫຼື ລະຫັດ"
              className={field}
            />
            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="text-xs text-muted">ຕ້ອງການໃຊ້ພາຍໃນວັນທີ</span>
            <input type="date" name="need_date" className={field} />
          </label>

          <label className="block">
            <span className="text-xs text-muted">ເອກະສານອ້າງອີງ</span>
            <input name="doc_ref" placeholder="ເລກທີ່ອ້າງອີງ" className={field} />
          </label>

          <label className="block sm:col-span-2 lg:col-span-3 2xl:col-span-5">
            <span className="text-xs text-muted">ເລື່ອງ / ຫົວຂໍ້ *</span>
            <input
              name="title"
              required
              placeholder="ຈັດຊື້ໂນດບຸກທົດແທນເຄື່ອງເກົ່າ"
              className={field}
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted">ສະກຸນເງິນ</span>
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={field}
            >
              {CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2 2xl:col-span-4">
            <span className="text-xs text-muted">ເຫດຜົນ / ຄວາມຈຳເປັນ</span>
            <textarea name="purpose" rows={2} className={field} />
          </label>

          <label className="block">
            <span className="text-xs text-muted">ບ່ອນສົ່ງມອບ</span>
            <input name="delivery_place" placeholder="ຫ້ອງໄອທີ ຊັ້ນ 2" className={field} />
          </label>

          <label className="block">
            <span className="text-xs text-muted">ງົບປະມານ</span>
            <input name="budget_note" placeholder="ງົບ IT ປີ 2026" className={field} />
          </label>
        </div>
      </section>

      {/* ---------- ຕາຕະລາງລາຍການ ---------- */}
      <section className="glass-card mt-5 overflow-hidden rounded-2xl">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-fg">
            ລາຍການສິນຄ້າ
            <span className="ml-2 text-xs font-normal text-muted">
              ({filled.length} ລາຍການ · ຄົ້ນຫາຈາກທະບຽນສິນຄ້າ ERP)
            </span>
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            + ເພີ່ມແຖວ
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-4xl text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="w-9 px-2 py-2 font-medium">#</th>
                <th className="w-44 px-2 py-2 font-medium">ລະຫັດສິນຄ້າ</th>
                <th className="px-2 py-2 font-medium">ຊື່ສິນຄ້າ *</th>
                <th className="w-20 px-2 py-2 font-medium">ຫົວໜ່ວຍ</th>
                <th className="w-20 px-2 py-2 text-right font-medium">ຈຳນວນ</th>
                <th className="w-32 px-2 py-2 text-right font-medium">ລາຄາ</th>
                <th className="w-28 px-2 py-2 text-right font-medium">ສ່ວນຫຼຸດ</th>
                <th className="w-32 px-2 py-2 text-right font-medium">ຈຳນວນເງິນ</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((line, index) => (
                <tr key={line.key} className="align-top">
                  <td className="px-2 py-2 text-muted">{index + 1}</td>

                  <td className="px-2 py-2">
                    <ItemPicker
                      value={line.item_code}
                      onPick={(item) =>
                        update(line.key, {
                          item_code: item.code,
                          item_name: item.name,
                          unit: item.unit_name ?? '',
                          est_price: item.avg_cost && Number(item.avg_cost) > 0
                            ? String(Math.round(Number(item.avg_cost)))
                            : line.est_price,
                        })
                      }
                      onType={(v) => update(line.key, { item_code: v })}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={line.item_name}
                      onChange={(e) => update(line.key, { item_name: e.target.value })}
                      placeholder="ເລືອກຈາກລະຫັດ ຫຼື ພິມເອງ"
                      className={cell}
                    />
                    <input
                      value={line.spec}
                      onChange={(e) => update(line.key, { spec: e.target.value })}
                      placeholder="ສະເປັກ / ລາຍລະອຽດ"
                      className={`${cell} mt-1 text-xs`}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={line.unit}
                      onChange={(e) => update(line.key, { unit: e.target.value })}
                      className={cell}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.qty}
                      onChange={(e) => update(line.key, { qty: e.target.value })}
                      className={`${cell} text-right`}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      inputMode="numeric"
                      value={line.est_price}
                      onChange={(e) => update(line.key, { est_price: e.target.value })}
                      placeholder="0"
                      className={`${cell} text-right`}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      inputMode="numeric"
                      value={line.discount}
                      onChange={(e) => update(line.key, { discount: e.target.value })}
                      placeholder="0"
                      className={`${cell} text-right`}
                    />
                  </td>

                  <td className="px-2 py-2 text-right whitespace-nowrap text-body">
                    {lineTotal(line) !== 0 ? money(lineTotal(line)) : '—'}
                  </td>

                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                      aria-label={`ລຶບແຖວ ${index + 1}`}
                      className="text-red-600 disabled:opacity-30 dark:text-red-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---------- ທ້າຍບິນແບບ SML ---------- */}
        <div className="flex justify-end border-t border-line bg-brand-blue/5 px-5 py-4">
          <dl className="w-full max-w-sm space-y-1.5 text-sm">
            <Row label="ລວມເປັນເງິນ" value={money(beforeDiscount)} />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">ສ່ວນຫຼຸດທ້າຍບິນ</dt>
              <dd>
                <input
                  name="discount_amount"
                  inputMode="numeric"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="input w-32 rounded-md px-2 py-1 text-right text-sm"
                />
              </dd>
            </div>

            <Row label="ມູນຄ່າຫຼັງຫັກສ່ວນຫຼຸດ" value={money(afterDiscount)} />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">
                ພາສີມູນຄ່າເພີ່ມ
                <input
                  name="vat_rate"
                  inputMode="numeric"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="input mx-1 w-12 rounded-md px-1.5 py-0.5 text-right text-xs"
                />
                %
              </dt>
              <dd className="text-body">{money(vat)}</dd>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
              <dt className="font-semibold text-fg">ລວມທັງສິ້ນ</dt>
              <dd className="text-lg font-semibold text-fg">
                {money(grand)} <span className="text-xs font-normal">{currency}</span>
              </dd>
            </div>

            {grand > 0 && (
              <p className="pt-1 text-right text-xs text-muted">
                ({amountInWords(grand)} {currency})
              </p>
            )}
          </dl>
        </div>
      </section>

      {/* ---------- ສາຍອະນຸມັດ + ບັນທຶກ ---------- */}
      <section className="glass-card mt-5 rounded-2xl p-5">
        <p className="text-xs text-muted">ໃບນີ້ຈະຜ່ານການອະນຸມັດຕາມລຳດັບ</p>
        <ol className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <li className="rounded-full bg-brand-blue/10 px-3 py-1 text-body">ຜູ້ສະເໜີ</li>
          {steps.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <span className="text-muted">→</span>
              <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-body">
                {name}
              </span>
            </li>
          ))}
          {steps.length === 0 && (
            <li className="text-brand-orange">
              ຍັງບໍ່ໄດ້ຕັ້ງຂັ້ນຕອນອະນຸມັດ — ໃຫ້ຜູ້ຈັດການຕັ້ງກ່ອນ
            </li>
          )}
        </ol>

        {state.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {state.error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SaveButton disabled={filled.length === 0} />
          <span className="text-xs text-faint">
            ບັນທຶກເປັນຮ່າງກ່ອນ — ແກ້ໄຂໄດ້ຈົນກວ່າຈະກົດສົ່ງອະນຸມັດ
          </span>
        </div>
      </section>
    </form>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  )
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn-primary rounded-lg px-6 py-2.5 text-sm font-medium disabled:opacity-50"
    >
      {pending ? 'ກຳລັງບັນທຶກ…' : 'ບັນທຶກເປັນຮ່າງ'}
    </button>
  )
}

/** ຊ່ອງລະຫັດສິນຄ້າພ້ອມການຄົ້ນຫາຈາກ ic_inventory */
function ItemPicker({
  value,
  onPick,
  onType,
}: {
  value: string
  onPick: (item: InventoryItem) => void
  onType: (value: string) => void
}) {
  const [results, setResults] = useState<InventoryItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  // ຫຼຸດຈຳນວນ request ໂດຍລໍໃຫ້ຜູ້ໃຊ້ຢຸດພິມກ່ອນ
  useEffect(() => {
    const term = value.trim()
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setResults([])
        setOpen(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/inventory/search?q=${encodeURIComponent(term)}`)
        if (res.ok) {
          setResults(await res.json())
          setOpen(true)
        }
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div ref={box} className="relative">
      <input
        value={value}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="ຄົ້ນຫາ…"
        className={cell}
        autoComplete="off"
      />
      {loading && (
        <span className="absolute top-2 right-2 text-[10px] text-faint">…</span>
      )}

      {open && results.length > 0 && (
        <ul className="glass-heavy absolute z-30 mt-1 max-h-72 w-96 overflow-y-auto rounded-lg py-1 shadow-lg">
          {results.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                onClick={() => {
                  onPick(item)
                  setOpen(false)
                }}
                className="hover-surface block w-full px-3 py-2 text-left transition"
              >
                <span className="block font-mono text-xs text-muted">{item.code}</span>
                <span className="block truncate text-sm text-fg">{item.name}</span>
                <span className="block text-[11px] text-faint">
                  {item.unit_name ?? '—'} · ຄົງເຫຼືອ{' '}
                  {Number(item.stock_qty).toLocaleString('lo-LA')}
                  {Number(item.avg_cost) > 0 &&
                    ` · ຕົ້ນທຶນ ${money(Number(item.avg_cost))}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
