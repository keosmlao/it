import ActionForm from '@/components/action-form'
import { requireMenuView } from '@/lib/auth/session'
import { getPriorities } from '@/lib/tickets/queries'
import { formatDuration } from '@/lib/format'
import { Panel } from '../panel'
import { updateSla } from '../actions'

export const metadata = { title: 'SLA' }

/** ເວລາຕອບ ແລະ ເວລາແກ້ໄຂຕາມລະດັບຄວາມດ່ວນ */
export default async function SlaPage() {
  await requireMenuView('/admin/sla')
  const priorities = await getPriorities()

  return (
    <div className="w-full">
      <Panel
        title="ຂໍ້ຕົກລົງລະດັບການບໍລິການ (SLA)"
        hint="ນັບເປັນນາທີແບບປະຕິທິນ ນັບຈາກເວລາທີ່ແຈ້ງ"
      >
        <div className="space-y-3">
          {priorities.map((p) => (
            <ActionForm
              key={p.priority}
              action={updateSla}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="priority" value={p.priority} />
              <span className="w-24 pb-2 text-sm text-body">{p.name_lo}</span>
              <label className="flex flex-col gap-1 text-xs text-muted">
                ຕອບພາຍໃນ (ນາທີ)
                <input
                  type="number"
                  name="respond_minutes"
                  min="1"
                  defaultValue={p.respond_minutes}
                  className="input w-32 rounded px-2 py-1 text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                ແກ້ໄຂພາຍໃນ (ນາທີ)
                <input
                  type="number"
                  name="resolve_minutes"
                  min="1"
                  defaultValue={p.resolve_minutes}
                  className="input w-32 rounded px-2 py-1 text-[13px]"
                />
              </label>
              <span className="pb-2 text-xs text-faint">
                = {formatDuration(p.respond_minutes)} /{' '}
                {formatDuration(p.resolve_minutes)}
              </span>
              <button
                type="submit"
                className="btn-secondary rounded px-3 py-1.5 text-[13px]"
              >
                ບັນທຶກ
              </button>
            </ActionForm>
          ))}
        </div>
      </Panel>
    </div>
  )
}
