import ActionForm, { SubmitButton } from '@/components/action-form'
import { requireMenuView } from '@/lib/auth/session'
import { formatDateTime } from '@/lib/format'
import { lineConfigured } from '@/lib/notify/line'
import { getOutboxStats, listOutbox } from '@/lib/notify/outbox'
import { Panel, Stat } from '../panel'
import {
  retryNotifications,
  sendQueuedNotifications,
  sendTestNotification,
} from '../actions'

export const metadata = { title: 'ແຈ້ງເຕືອນ LINE' }

const OUTBOX_LABEL: Record<string, string> = {
  pending: 'ຄ້າງຢູ່ຄິວ',
  sent: 'ສົ່ງແລ້ວ',
  failed: 'ລົ້ມເຫຼວ',
  skipped: 'ຂ້າມ',
}

/** ຄິວຂໍ້ຄວາມ LINE — ສະຖານະ ແລະ ປຸ່ມສົ່ງດ້ວຍມື */
export default async function LinePage() {
  await requireMenuView('/admin/line')

  const [outbox, outboxRows] = await Promise.all([getOutboxStats(), listOutbox(20)])
  const lineReady = lineConfigured()

  return (
    <div className="w-full">
      <Panel
        title="ແຈ້ງເຕືອນທາງ LINE"
        hint={
          lineReady
            ? `ພະນັກງານທີ່ຜູກ LINE ແລ້ວພ້ອມຮັບການແຈ້ງເຕືອນ · ຍັງບໍ່ໄດ້ຜູກ ${outbox?.no_line ?? 0} ຄົນ`
            : 'ຍັງບໍ່ໄດ້ຕັ້ງ LINE_CHANNEL_ACCESS_TOKEN ໃນ .env.local — ຂໍ້ຄວາມຈະຄ້າງຢູ່ຄິວຈົນກວ່າຈະຕັ້ງຄ່າ'
        }
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <Stat label="ຄ້າງຢູ່ຄິວ" value={outbox?.pending ?? '0'} warn />
          <Stat label="ສົ່ງແລ້ວ" value={outbox?.sent ?? '0'} />
          <Stat label="ລົ້ມເຫຼວ" value={outbox?.failed ?? '0'} danger />
          <Stat label="ຂ້າມ (ບໍ່ມີ LINE)" value={outbox?.skipped ?? '0'} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ActionForm action={sendQueuedNotifications}>
            <SubmitButton
              pendingLabel="ກຳລັງສົ່ງ…"
              className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
            >
              ສົ່ງຂໍ້ຄວາມທີ່ຄ້າງ
            </SubmitButton>
          </ActionForm>

          <ActionForm action={retryNotifications}>
            <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-[13px]">
              ລອງສົ່ງອັນທີ່ລົ້ມເຫຼວໃໝ່
            </SubmitButton>
          </ActionForm>

          <ActionForm action={sendTestNotification}>
            <SubmitButton
              pendingLabel="ກຳລັງສົ່ງ…"
              className="btn-secondary rounded px-3 py-1.5 text-[13px]"
            >
              ສົ່ງທົດສອບຫາຕົນເອງ
            </SubmitButton>
          </ActionForm>
        </div>

        {outboxRows.length > 0 && (
          <div className="o-list-wrap mt-3 overflow-x-auto">
            <table className="o-list w-full min-w-[560px] text-[13px]">
              <thead>
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">ເວລາ</th>
                  <th className="px-3 py-1.5 text-left font-medium">ຜູ້ຮັບ</th>
                  <th className="px-3 py-1.5 text-left font-medium">ຫົວຂໍ້</th>
                  <th className="px-3 py-1.5 text-left font-medium">ສະຖານະ</th>
                  <th className="px-3 py-1.5 text-left font-medium">ເຫດຜົນ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {outboxRows.map((row) => (
                  <tr key={row.id} className="hover-surface transition">
                    <td className="px-3 py-1.5 text-xs whitespace-nowrap text-muted">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-3 py-1.5 text-body">{row.fullname_lo}</td>
                    <td className="px-3 py-1.5 text-muted">{row.title}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          row.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : row.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-muted dark:bg-white/5'
                        }`}
                      >
                        {OUTBOX_LABEL[row.status] ?? row.status}
                      </span>
                      {row.attempts > 0 && (
                        <span className="ml-1 text-[11px] text-faint">
                          ×{row.attempts}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted">
                      {row.last_error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
