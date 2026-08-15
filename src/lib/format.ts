const dateTime = new Intl.DateTimeFormat('lo-LA', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Vientiane',
})

export function formatDateTime(value: string | Date | null): string {
  if (!value) return '—'
  return dateTime.format(new Date(value))
}

/**
 * yyyy-MM-dd ສຳລັບ <input type="date"> ແລະ ຄ່າໃນ URL.
 *
 * ໂຕຂັບ pg ແປງຄໍລຳຊະນິດ `date` ອອກມາເປັນ Date ຂອງ JS (ບໍ່ແມ່ນ string)
 * ສະນັ້ນ `value.slice(0, 10)` ຈະພັງ — ໃຫ້ຜ່ານທາງນີ້ສະເໝີ
 */
export function isoDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)

  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** ບວກ/ລົບວັນຈາກຄ່າວັນທີໃດກໍໄດ້ ແລ້ວຄືນເປັນ yyyy-MM-dd */
export function shiftDate(value: string | Date, days: number): string {
  const iso = isoDate(value)
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** ວັນທີມື້ນີ້ຕາມເວລາລາວ ແບບ yyyy-MM-dd */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(
    new Date()
  )
}

/** ໄລຍະເວລາແບບອ່ານງ່າຍ: "2 ຊມ 15 ນທ", "3 ມື້" */
export function formatDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes))
  if (abs < 60) return `${abs} ນທ`

  const hours = Math.floor(abs / 60)
  if (hours < 24) {
    const rest = abs % 60
    return rest ? `${hours} ຊມ ${rest} ນທ` : `${hours} ຊມ`
  }

  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days} ມື້ ${restHours} ຊມ` : `${days} ມື້`
}

/** ເຫຼືອອີກເທົ່າໃດ ຫຼື ເກີນມາແລ້ວເທົ່າໃດ ທຽບກັບກຳນົດ */
export function formatDeadline(due: string | null): {
  text: string
  overdue: boolean
} {
  if (!due) return { text: '—', overdue: false }

  const diffMinutes = (new Date(due).getTime() - Date.now()) / 60000
  const overdue = diffMinutes < 0
  return {
    text: overdue
      ? `ເກີນມາ ${formatDuration(diffMinutes)}`
      : `ເຫຼືອ ${formatDuration(diffMinutes)}`,
    overdue,
  }
}

/**
 * ຂະໜາດໄຟລ໌ແບບອ່ານງ່າຍ
 *
 * ຢູ່ໃນໄຟລ໌ນີ້ (ບໍ່ແມ່ນ uploads.ts) ເພາະ client component ຕ້ອງໃຊ້ນຳ —
 * uploads.ts ມີ `import 'server-only'` ຈຶ່ງ import ເຂົ້າ client ບໍ່ໄດ້
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
