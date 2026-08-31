import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireModuleView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getSubscription, getSubscriptionPeriods } from '@/lib/subscriptions/queries'
import {
  BILLING_CYCLE_LABEL_LO,
  SUB_CATEGORY_LABEL_LO,
  formatAmount,
} from '@/lib/subscriptions/model'
import { DueBadge, SubStatusBadge } from '@/components/subscription-badge'
import { safeDate } from '@/lib/assets/model'
import { formatDateTime, todayISO } from '@/lib/format'
import DocumentPanel from '@/components/document-panel'
import { listDocuments } from '@/lib/attachments/documents'
import PaymentPanel from './payment-panel'
import PeriodRow from './period-row'

export default async function SubscriptionPage({
  params,
}: PageProps<'/subscriptions/[id]'>) {
  const { id } = await params
  const user = await requireModuleView('subscriptions')

  const subscription = await getSubscription(id)
  if (!subscription) notFound()

  const [periods, documents] = await Promise.all([
    getSubscriptionPeriods(id),
    listDocuments('subscription', id),
  ])
  const editable = can.manageSubscriptions(user)
  const s = subscription

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{s.code}</p>
      <h1 className="mt-1 text-xl font-semibold text-fg">{s.service_name}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SubStatusBadge status={s.status} />
        <DueBadge status={s.due_status} />
        <span className="text-sm text-muted">
          {SUB_CATEGORY_LABEL_LO[s.category]}
          {s.vendor && ` · ${s.vendor}`}
          {s.plan_name && ` · ${s.plan_name}`}
        </span>
        {editable && (
          <Link
            href={`/subscriptions/${s.id}/edit`}
            className="btn-secondary ml-auto rounded px-3 py-1.5 text-[13px]"
          >
            ແກ້ໄຂ
          </Link>
        )}
      </div>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ຄ່າເຊົ່າຕໍ່ງວດ" value={formatAmount(s.amount, s.currency)} />
        <Info label="ຮອບການຈ່າຍ" value={BILLING_CYCLE_LABEL_LO[s.billing_cycle]} />
        <Info
          label="ຄິດເປັນຕໍ່ເດືອນ"
          value={formatAmount(s.monthly_amount, s.currency)}
        />
        <Info label="ຄິດເປັນຕໍ່ປີ" value={formatAmount(s.yearly_amount, s.currency)} />

        <Info label="ກຳນົດຈ່າຍຄັ້ງຕໍ່ໄປ" value={safeDate(s.next_due_date)} />
        <Info
          label="ວັນເລີ່ມ – ສິ້ນສຸດ"
          value={`${safeDate(s.start_date)} – ${s.end_date ? safeDate(s.end_date) : 'ບໍ່ກຳນົດ'}`}
        />
        <Info label="ຕໍ່ອາຍຸອັດຕະໂນມັດ" value={s.auto_renew ? 'ແມ່ນ' : 'ບໍ່ແມ່ນ'} />
        <Info label="ຜູ້ຮັບຜິດຊອບ" value={s.owner_name ?? '—'} />

        <Info label="ພະແນກທີ່ຮັບພາລະ" value={s.department_name ?? '—'} />
        <Info label="ບັນຊີ / ເລກສັນຍາ" value={s.account_ref ?? '—'} />
        <Info
          label="ຈ່າຍໄປແລ້ວທັງໝົດ"
          value={formatAmount(s.paid_total, s.currency)}
        />
        <Info
          label="ງວດທີ່ຍັງບໍ່ຈ່າຍ"
          value={Number(s.unpaid_count) > 0 ? `${s.unpaid_count} ງວດ` : '—'}
        />
      </div>

      {(s.admin_url || s.note) && (
        <div className="glass-card mt-4 rounded-xl p-5">
          {s.admin_url && (
            <p className="text-sm">
              <span className="text-xs text-muted">ໜ້າຈັດການ: </span>
              <a
                href={s.admin_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-blue underline"
              >
                {s.admin_url}
              </a>
            </p>
          )}
          {s.note && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-body">{s.note}</p>
          )}
        </div>
      )}

      {editable && <PaymentPanel subscription={s} today={todayISO()} />}

      <DocumentPanel
        entityType="subscription"
        entityId={s.id}
        documents={documents}
        editable={editable}
        hint="ໃບສັນຍາ · ໃບບິນ · ໜັງສືແຈ້ງລາຄາ"
      />

      <div className="glass-card mt-4 rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">ປະຫວັດການຈ່າຍ</h2>
          <span className="text-xs text-muted">{s.period_count} ງວດ</span>
        </div>

        <div className="divide-line divide-y">
          {periods.map((p) => (
            <PeriodRow key={p.id} period={p} editable={editable} />
          ))}
          {periods.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              ຍັງບໍ່ໄດ້ບັນທຶກງວດການຈ່າຍ
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-faint">
        ລົງທະບຽນໂດຍ {s.created_by_name ?? '—'} · {formatDateTime(s.created_at)}
        {s.updated_at !== s.created_at && ` · ແກ້ລ່າສຸດ ${formatDateTime(s.updated_at)}`}
      </p>
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
