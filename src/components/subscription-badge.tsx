import {
  DUE_STATUS_LABEL_LO,
  DUE_STATUS_STYLE,
  PERIOD_STATUS_LABEL_LO,
  PERIOD_STATUS_STYLE,
  SUB_STATUS_LABEL_LO,
  SUB_STATUS_STYLE,
  type DueStatus,
  type PeriodStatus,
  type SubStatus,
} from '@/lib/subscriptions/model'

const base = 'inline-block rounded-full px-2 py-0.5 text-xs font-medium'

/** ສະຖານະກຳນົດຈ່າຍ — ອັນທີ່ຜູ້ໃຊ້ຕ້ອງເບິ່ງກ່ອນໝູ່ */
export function DueBadge({ status }: { status: DueStatus }) {
  return (
    <span className={`${base} ${DUE_STATUS_STYLE[status]}`}>
      {DUE_STATUS_LABEL_LO[status]}
    </span>
  )
}

/** ສະຖານະສັນຍາ — ໃຊ້ໃນໜ້າລາຍລະອຽດ ບ່ອນທີ່ຕ້ອງຮູ້ວ່າຍັງເຊົ່າຢູ່ບໍ */
export function SubStatusBadge({ status }: { status: SubStatus }) {
  return (
    <span className={`${base} ${SUB_STATUS_STYLE[status]}`}>
      {SUB_STATUS_LABEL_LO[status]}
    </span>
  )
}

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  return (
    <span className={`${base} ${PERIOD_STATUS_STYLE[status]}`}>
      {PERIOD_STATUS_LABEL_LO[status]}
    </span>
  )
}
