import {
  STATUS_LABEL_LO,
  TICKET_FLOW,
  type TicketStatus,
} from '@/lib/tickets/model'

/**
 * ແຖບຂັ້ນຕອນຂອງ ticket
 *
 * ເຫດຜົນ: ໜ້ານີ້ສະແດງທຸກກ່ອງພ້ອມກັນຕະຫຼອດ ຄົນເປີດເຂົ້າມາຈຶ່ງບໍ່ຮູ້ວ່າ
 * "ຮອດໃສແລ້ວ" ແລະ "ຕ້ອງເຮັດຫຍັງຕໍ່" — ຕ້ອງໄປອ່ານ dropdown ສະຖານະເອົາເອງ.
 * ແຖບນີ້ຕອບສອງຄຳຖາມນັ້ນຢູ່ເທິງສຸດ ກ່ອນຈະລົງໄປລາຍລະອຽດ
 */

/** ສະຖານະໃດຢືນຢູ່ຂັ້ນໃດ — ຍົກເລີກຢູ່ນອກເສັ້ນ ຈຶ່ງເປັນ -1 */
const STEP_AT: Record<TicketStatus, number> = {
  new: 0,
  assigned: 1,
  in_progress: 2,
  // ຂັ້ນທີ 4 ຄື "ຜົນ" — ອອກໄດ້ 2 ທາງ ແຕ່ຢືນຢູ່ຂັ້ນດຽວກັນ
  resolved: 3,
  unrepairable: 3,
  closed: 4,
  cancelled: -1,
}

/**
 * ຂັ້ນຕໍ່ໄປທີ່ພະນັກງານ IT ຕ້ອງລົງມື — ບອກເປັນປະໂຫຍກດຽວ ບໍ່ໃຫ້ຄິດເອງ
 *
 * ສ້າງຕອນເອີ້ນ ບໍ່ແມ່ນຊັ້ນ module — ຊື່ສະຖານະມາຈາກ module ອື່ນ ເຊິ່ງອາດ
 * ຍັງບໍ່ທັນພ້ອມຕອນ module ນີ້ຖືກປະເມີນ
 */
function nextStepLo(status: TicketStatus): string {
  const q = (s: TicketStatus) => `“${STATUS_LABEL_LO[s]}”`

  switch (status) {
    case 'new':
      return 'ມອບໝາຍຜູ້ຮັບຜິດຊອບ ຫຼື ຮັບວຽກເອງ ແລ້ວຕອບກັບຜູ້ແຈ້ງໃຫ້ທັນ SLA'
    case 'assigned':
      return `ເລີ່ມລົງມື ແລ້ວປ່ຽນສະຖານະເປັນ ${q('in_progress')}`
    case 'in_progress':
      return `ແກ້ແລ້ວກົດ ${q('resolved')} — ຂຽນວິທີແກ້ ແລະ ແນບຮູບຫຼັກຖານໃນບ່ອນດຽວກັນ. ສ້ອມບໍ່ໄດ້ໃຫ້ກົດ ${q('unrepairable')} ພ້ອມບອກເຫດຜົນ`
    case 'resolved':
      return `ສົ່ງເຄື່ອງ/ງານຄືນຜູ້ແຈ້ງ ແລ້ວກົດ ${q('closed')}`
    case 'unrepairable':
      return `ແຈ້ງຜູ້ແຈ້ງ ແລະ ພິຈາລະນາຕັດຈຳໜ່າຍ/ຊື້ໃໝ່ ແລ້ວກົດ ${q('closed')}`
    case 'closed':
      return 'ວຽກນີ້ຈົບແລ້ວ'
    case 'cancelled':
      return 'ວຽກນີ້ຖືກຍົກເລີກ'
  }
}

export default function TicketSteps({
  status,
  showHint,
}: {
  status: TicketStatus
  /** ບອກຂັ້ນຕໍ່ໄປສະເພາະຄົນທີ່ລົງມືໄດ້ — ຜູ້ແຈ້ງເຫັນແຕ່ແຖບຂັ້ນຕອນ */
  showHint: boolean
}) {
  const at = STEP_AT[status]
  // ຂັ້ນ "ຜົນ" ສະຫຼັບຊື່ຕາມຜົນຈິງ — ສ້ອມບໍ່ໄດ້ກໍໃຫ້ເຫັນຢູ່ເສັ້ນດຽວກັນ
  const flow = TICKET_FLOW.map((s) =>
    s === 'resolved' && status === 'unrepairable' ? 'unrepairable' : s
  )

  if (at < 0) {
    return (
      <section className="glass-card mt-4 rounded-xl px-4 py-3">
        <p className="text-sm text-muted">{nextStepLo(status)}</p>
      </section>
    )
  }

  return (
    <section className="glass-card mt-4 rounded-xl px-4 py-3">
      <ol className="flex flex-wrap items-center gap-y-2">
        {flow.map((step, i) => {
          const done = i < at
          const here = i === at

          return (
            <li key={step} className="flex items-center">
              <span
                aria-current={here ? 'step' : undefined}
                className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm ${
                  here
                    ? 'brand-gradient-cool font-medium text-white'
                    : done
                      ? 'text-body'
                      : 'text-faint'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    here
                      ? 'bg-white/25'
                      : done
                        ? 'bg-brand-blue/15 text-brand-blue'
                        : 'bg-brand-blue/5'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                {STATUS_LABEL_LO[step]}
              </span>

              {i < flow.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-1 h-px w-5 ${done ? 'bg-brand-blue/40' : 'bg-line'}`}
                />
              )}
            </li>
          )
        })}
      </ol>

      {showHint && (
        <p className="mt-2 text-sm text-body">
          <span className="text-muted">ຂັ້ນຕໍ່ໄປ:</span> {nextStepLo(status)}
        </p>
      )}
    </section>
  )
}
