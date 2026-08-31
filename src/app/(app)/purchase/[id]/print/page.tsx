import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import {
  getPurchaseApprovals,
  getPurchaseLines,
  getPurchaseRequest,
  getStepsForAmount,
} from '@/lib/purchase/queries'
import { amountInWords } from '@/lib/purchase/model'
import { formatMoney, safeDate } from '@/lib/assets/model'

export const metadata = { title: 'ພິມໃບສະເໜີຊື້' }

/**
 * ຟອມສຳລັບພິມ — ຫົວກະດາດ, ຕາຕະລາງລາຍການ, ຍອດເປັນຕົວໜັງສື ແລະ ຊ່ອງເຊັນ
 * ຕາມຈຳນວນຂັ້ນອະນຸມັດທີ່ຕັ້ງໄວ້ຈິງ
 */
export default async function PurchasePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireMenuView('/purchase')

  const pr = await getPurchaseRequest(id)
  if (!pr) notFound()

  const [lines, approvals, steps] = await Promise.all([
    getPurchaseLines(id),
    getPurchaseApprovals(id),
    getStepsForAmount(Number(pr.total_est)),
  ])

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-black print:p-0">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href={`/purchase/${pr.id}`} className="text-sm text-muted hover:underline">
          ← ກັບຄືນ
        </Link>
        <span className="text-xs text-muted">
          ກົດ Ctrl + P ເພື່ອພິມ ຫຼື ບັນທຶກເປັນ PDF
        </span>
      </div>

      {/* ---------- ຫົວກະດາດ ---------- */}
      <header className="border-b-2 border-black pb-3 text-center">
        <p className="text-sm">ບໍລິສັດ ໂອດຽນ ກຣຸບ ຈຳກັດຜູ້ດຽວ</p>
        <h1 className="mt-1 text-xl font-bold">ໃບສະເໜີຂໍຊື້ / PURCHASE REQUISITION</h1>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-x-6 text-sm">
        <div className="space-y-0.5">
          <p>
            <span className="inline-block w-28">ເລກທີ່</span>
            <span className="font-mono font-semibold">{pr.pr_no}</span>
          </p>
          <p>
            <span className="inline-block w-28">ພະແນກ</span>
            {pr.department_name ?? '—'}
            {pr.unit_name_lo && ` / ${pr.unit_name_lo}`}
          </p>
          <p>
            <span className="inline-block w-28">ຜູ້ສະເໜີ</span>
            {pr.requester_name ?? pr.requester_code}
            {pr.requester_position && ` (${pr.requester_position})`}
          </p>
          <p>
            <span className="inline-block w-28">ຜູ້ຈຳໜ່າຍ</span>
            {pr.supplier_name ?? pr.supplier_suggestion ?? '—'}
          </p>
        </div>
        <div className="space-y-0.5">
          <p>
            <span className="inline-block w-28">ວັນທີ</span>
            {safeDate(pr.doc_date as string)}
          </p>
          <p>
            <span className="inline-block w-28">ຕ້ອງການພາຍໃນ</span>
            {safeDate(pr.need_date as string)}
          </p>
          <p>
            <span className="inline-block w-28">ສະກຸນເງິນ</span>
            {pr.currency}
          </p>
          <p>
            <span className="inline-block w-28">ອ້າງອີງ</span>
            {pr.doc_ref ?? '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm">
        <span className="font-semibold">ເລື່ອງ:</span> {pr.title}
      </p>
      {pr.purpose && (
        <p className="mt-1 text-sm">
          <span className="font-semibold">ເຫດຜົນ:</span> {pr.purpose}
        </p>
      )}

      {/* ---------- ຕາຕະລາງລາຍການ ---------- */}
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black px-2 py-1.5 w-10">ລ/ດ</th>
            <th className="border border-black px-2 py-1.5 text-left">
              ລາຍການ / ລາຍລະອຽດ
            </th>
            <th className="border border-black px-2 py-1.5 w-16">ຈຳນວນ</th>
            <th className="border border-black px-2 py-1.5 w-16">ຫົວໜ່ວຍ</th>
            <th className="border border-black px-2 py-1.5 w-24">ລາຄາ</th>
            <th className="border border-black px-2 py-1.5 w-24">ສ່ວນຫຼຸດ</th>
            <th className="border border-black px-2 py-1.5 w-28">ຈຳນວນເງິນ</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="border border-black px-2 py-1.5 text-center">
                {line.line_no}
              </td>
              <td className="border border-black px-2 py-1.5">
                {line.item_name}
                {line.item_code && (
                  <span className="ml-1 text-xs text-slate-600">({line.item_code})</span>
                )}
                {line.spec && (
                  <div className="text-xs whitespace-pre-wrap text-slate-600">
                    {line.spec}
                  </div>
                )}
              </td>
              <td className="border border-black px-2 py-1.5 text-right">
                {Number(line.qty).toLocaleString('lo-LA')}
              </td>
              <td className="border border-black px-2 py-1.5 text-center">
                {line.unit ?? ''}
              </td>
              <td className="border border-black px-2 py-1.5 text-right">
                {formatMoney(line.est_price)}
              </td>
              <td className="border border-black px-2 py-1.5 text-right">
                {Number(line.discount) > 0 ? formatMoney(line.discount) : ''}
              </td>
              <td className="border border-black px-2 py-1.5 text-right">
                {formatMoney(line.line_total)}
              </td>
            </tr>
          ))}

          {/* ແຖວວ່າງໃຫ້ຕາຕະລາງເຕັມໜ້າ ຄືຟອມກະດາດ */}
          {Array.from({ length: Math.max(0, 8 - lines.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td className="border border-black px-2 py-1.5">&nbsp;</td>
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
            </tr>
          ))}

          {/* ທ້າຍບິນຕາມລຳດັບຂອງ SML */}
          <FootRow label="ລວມເປັນເງິນ" value={formatMoney(pr.total_before_discount)} />
          {Number(pr.discount_amount) > 0 && (
            <>
              <FootRow
                label="ຫັກສ່ວນຫຼຸດທ້າຍບິນ"
                value={formatMoney(pr.discount_amount)}
              />
              <FootRow
                label="ມູນຄ່າຫຼັງຫັກສ່ວນຫຼຸດ"
                value={formatMoney(pr.total_after_discount)}
              />
            </>
          )}
          {Number(pr.vat_rate) > 0 && (
            <FootRow
              label={`ພາສີມູນຄ່າເພີ່ມ ${Number(pr.vat_rate)}%`}
              value={formatMoney(pr.vat_amount)}
            />
          )}
          <FootRow label="ລວມທັງສິ້ນ" value={formatMoney(pr.total_est)} bold />

          <tr>
            <td colSpan={7} className="border border-black px-2 py-1.5 text-sm">
              ຕົວໜັງສື: {amountInWords(Number(pr.total_est))} {pr.currency}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 space-y-1 text-sm">
        {pr.delivery_place && <p>ບ່ອນສົ່ງມອບ: {pr.delivery_place}</p>}
        {pr.budget_note && <p>ງົບປະມານ: {pr.budget_note}</p>}
        {pr.erp_note && <p>ໝາຍເຫດ: {pr.erp_note}</p>}
      </div>

      {/* ---------- ຊ່ອງເຊັນ ---------- */}
      <div
        className="mt-10 grid gap-6 text-center text-sm"
        style={{
          gridTemplateColumns: `repeat(${Math.min(steps.length + 1, 4)}, minmax(0, 1fr))`,
        }}
      >
        <SignBlock
          role="ຜູ້ສະເໜີ"
          name={pr.requester_name}
          date={safeDate(pr.doc_date as string)}
        />
        {steps.map((step) => {
          const done = approvals.find(
            (a) => a.step_no === step.step_no && a.decision === 'approved'
          )
          return (
            <SignBlock
              key={step.step_no}
              role={step.name_lo}
              name={done?.approver_name ?? step.approver_name}
              date={done ? safeDate(done.decided_at) : ''}
            />
          )
        })}
      </div>

      <p className="mt-8 text-center text-[10px] text-slate-500">
        ພິມຈາກລະບົບບໍລິຫານພະແນກໄອທີ · {pr.pr_no} ·{' '}
        {safeDate(new Date().toISOString())}
      </p>
    </div>
  )
}

/** ແຖວທ້າຍບິນ — ປ້າຍຢູ່ຂວາຂອງຕາຕະລາງ ຄືເອກະສານ SML */
function FootRow({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <tr className={bold ? 'font-semibold' : ''}>
      <td colSpan={6} className="border border-black px-2 py-1.5 text-right">
        {label}
      </td>
      <td className="border border-black px-2 py-1.5 text-right">{value}</td>
    </tr>
  )
}

function SignBlock({
  role,
  name,
  date,
}: {
  role: string
  name: string | null
  date: string
}) {
  return (
    <div>
      <p className="font-semibold">{role}</p>
      <div className="mt-12 border-t border-black pt-1">
        <p>{name ?? '.............................'}</p>
        <p className="text-xs text-slate-600">
          ວັນທີ {date && date !== '—' ? date : '......./......./..........'}
        </p>
      </div>
    </div>
  )
}
