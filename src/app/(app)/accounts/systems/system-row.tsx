'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { SYSTEM_KIND_LABEL_LO, type AccountSystem } from '@/lib/accounts/model'
import { setSystemActive } from '../actions'

/** ແຖວລະບົບ — ບອກ seat ທີ່ຈ່າຍ ທຽບກັບຄົນທີ່ໃຊ້ຈິງ */
export default function SystemRow({ system }: { system: AccountSystem }) {
  const s = system
  const overSeat = s.seats_free !== null && s.seats_free < 0

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="w-28 truncate font-mono text-xs text-muted">{s.code}</span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-fg">
          {s.name}
          {!s.is_active && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted dark:bg-white/5">
              ປິດໄວ້
            </span>
          )}
        </span>
        <span className="text-xs text-muted">
          {SYSTEM_KIND_LABEL_LO[s.kind]}
          {s.subscription_name && ` · ຈ່າຍຜ່ານ ${s.subscription_name}`}
          {s.owner_name && ` · ດູແລໂດຍ ${s.owner_name}`}
        </span>
      </span>

      <span className="text-right text-xs">
        <span className={overSeat ? 'font-medium text-red-600 dark:text-red-400' : 'text-body'}>
          ໃຊ້ {s.active_count}
          {s.seat_limit !== null && ` / ${s.seat_limit}`}
        </span>
        {Number(s.closable_count) > 0 && (
          <span className="block text-brand-orange">{s.closable_count} ຄວນປິດ</span>
        )}
      </span>

      <ActionForm action={setSystemActive}>
        <input type="hidden" name="code" value={s.code} />
        <input type="hidden" name="is_active" value={s.is_active ? '0' : '1'} />
        <SubmitButton
          className="rounded-lg px-3 py-1 text-xs text-muted hover:text-brand-blue"
          pendingLabel="…"
        >
          {s.is_active ? 'ປິດໄວ້' : 'ເປີດຄືນ'}
        </SubmitButton>
      </ActionForm>
    </div>
  )
}
