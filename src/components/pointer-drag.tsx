'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * ລາກກາດດ້ວຍ pointer event ເອງ — ບໍ່ໃຊ້ HTML5 drag & drop
 *
 * ເຫດຜົນ: HTML5 DnD ມີເງື່ອນໄຂແອບແຝງຫຼາຍ (ລູກທີ່ເປັນລິ້ງລາກແທນ,
 * ຕ້ອງ preventDefault ໃນ dragover ໃຫ້ຖືກຈຸດ, dataTransfer ຕ່າງກັນແຕ່ລະ browser)
 * ເຮັດໃຫ້ຫາສາເຫດຍາກເມື່ອລາກບໍ່ໄດ້. pointerdown/move/up ເປັນ event ທຳມະດາ
 * ຄິດເອງໄດ້ໝົດ ແລະ ເຫັນຜົນແນ່ນອນ
 *
 * ຖັນປາຍທາງຫາຈາກ `data-drop-column` ທີ່ຢູ່ໃຕ້ຕົວຊີ້ ຈຶ່ງບໍ່ຕ້ອງຜູກ handler
 * ໃສ່ແຕ່ລະຖັນ. ໜ້າຈໍສຳຜັດຂ້າມໄປ — ໃຊ້ປຸ່ມແທນ ບໍ່ດັ່ງນັ້ນເລື່ອນຈໍບໍ່ໄດ້
 */

const DRAG_THRESHOLD_PX = 6
const COLUMN_ATTR = 'data-drop-column'

function columnAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)
  return el?.closest(`[${COLUMN_ATTR}]`)?.getAttribute(COLUMN_ATTR) ?? null
}

export function usePointerDrag<T>({
  canDrop,
  onDrop,
  label,
}: {
  /** ຢ່ອນ item ນີ້ລົງຖັນນີ້ໄດ້ບໍ */
  canDrop: (item: T, column: string) => boolean
  onDrop: (item: T, column: string) => void
  /** ຂໍ້ຄວາມທີ່ຕິດຕາມຕົວຊີ້ຂະນະລາກ */
  label: (item: T) => string
}) {
  const [item, setItem] = useState<T | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)

  // listener ຜູກຄັ້ງດຽວຕອນ mount ຈຶ່ງອ່ານ callback ຜ່ານ ref
  const handlers = useRef({ canDrop, onDrop, label })
  useEffect(() => {
    handlers.current = { canDrop, onDrop, label }
  }, [canDrop, onDrop, label])

  const pending = useRef<{ item: T; x: number; y: number } | null>(null)
  const active = useRef(false)

  /** ໃສ່ໃນ onPointerDown ຂອງກາດ */
  const begin = useCallback((event: React.PointerEvent, value: T) => {
    if (event.pointerType === 'touch') return
    if (event.button !== 0) return

    // ກັນສະເພາະຕົວຄວບຄຸມແທ້ — **ລິ້ງບໍ່ກັນ** ເພາະຫົວຂໍ້ກາດເປັນລິ້ງ
    // ເຊິ່ງເປັນບ່ອນທີ່ຄົນຈັບລາກຫຼາຍທີ່ສຸດ. ກົດເສີຍໆຍັງເປີດລິ້ງຄືເກົ່າ —
    // ຖ້າລາກຈິງ onUp ຈະກິນ click ທີ່ຕິດຕາມມາ ຈຶ່ງບໍ່ເດັ້ງໜ້າ
    const el = event.target as HTMLElement
    if (el.closest('button, select, input, textarea')) return

    pending.current = { item: value, x: event.clientX, y: event.clientY }
  }, [])

  useEffect(() => {
    function reset() {
      pending.current = null
      active.current = false
      setItem(null)
      setOver(null)
      setPoint(null)
    }

    function onMove(event: PointerEvent) {
      const held = pending.current
      if (!held) return

      // ຍັງບໍ່ຮອດໄລຍະ = ຖືວ່າກຳລັງກົດ ບໍ່ແມ່ນລາກ ຈຶ່ງກົດເລືອກຂໍ້ຄວາມໄດ້ຕາມປົກກະຕິ
      if (!active.current) {
        const moved = Math.hypot(event.clientX - held.x, event.clientY - held.y)
        if (moved < DRAG_THRESHOLD_PX) return
        active.current = true
        setItem(held.item)
      }

      setPoint({ x: event.clientX, y: event.clientY })
      const column = columnAt(event.clientX, event.clientY)
      setOver(
        column && handlers.current.canDrop(held.item, column) ? column : null
      )
    }

    function onUp(event: PointerEvent) {
      const held = pending.current
      const wasDragging = active.current
      reset()
      if (!held || !wasDragging) return

      // ລາກຈົບເທິງລິ້ງ = ຢ່າໃຫ້ browser ຖືວ່າກົດລິ້ງ ບໍ່ດັ່ງນັ້ນຈະເດັ້ງໜ້າ
      const swallowClick = (click: MouseEvent) => {
        click.preventDefault()
        click.stopPropagation()
      }
      window.addEventListener('click', swallowClick, {
        capture: true,
        once: true,
      })
      window.setTimeout(
        () => window.removeEventListener('click', swallowClick, true),
        300
      )

      const column = columnAt(event.clientX, event.clientY)
      if (column && handlers.current.canDrop(held.item, column)) {
        handlers.current.onDrop(held.item, column)
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') reset()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    // ຍົກເລີກ = ມີສິ່ງອື່ນຍຶດ pointer ໄປ ບໍ່ແມ່ນຜູ້ໃຊ້ຢ່ອນ — ລ້າງຖິ້ມ ຢ່າຢ່ອນ
    window.addEventListener('pointercancel', reset)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', reset)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  /**
   * ປ້າຍຕິດຕາມຕົວຊີ້ — ໃສ່ `pointer-events-none` ບໍ່ດັ່ງນັ້ນ elementFromPoint
   * ຈະຈັບໄດ້ປ້າຍນີ້ແທນຖັນທີ່ຢູ່ລຸ່ມ
   */
  const ghost =
    item && point ? (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 max-w-56 truncate rounded-lg glass-heavy px-3 py-1.5 text-xs text-fg shadow-lg"
        style={{ left: point.x + 12, top: point.y + 12 }}
      >
        {label(item)}
      </div>
    ) : null

  return { item, over, begin, ghost, dragging: item !== null }
}

/** ໃສ່ໃນ element ຂອງຖັນ ເພື່ອໃຫ້ hook ຫາເຫັນ */
export function dropColumn(column: string) {
  return { [COLUMN_ATTR]: column }
}

/**
 * ໃສ່ໃນ element ຂອງກາດ — ກັນການລາກແບບພື້ນເມືອງຂອງ browser
 *
 * ຫົວກາດເປັນ <a> ເຊິ່ງ browser ຖືວ່າລາກໄດ້ຢູ່ແລ້ວ (ຮູບກໍຄືກັນ). ພໍຈັບລາກ
 * ຈາກຫົວກາດ browser ຈະເລີ່ມ drag ຂອງມັນເອງ ແລ້ວຢຶດ pointer ໄປ —
 * ຢຸດສົ່ງ pointermove/pointerup ໃຫ້ເຮົາ ແລ້ວສົ່ງ pointercancel ແທນ
 * ຜົນຄື "ລາກແລ້ວບໍ່ໄປ" ເພາະ onDrop ບໍ່ເຄີຍຖືກເອີ້ນ
 *
 * dragstart ຟົດຂຶ້ນມາເຖິງກາດ ຈຶ່ງກັນຢູ່ບ່ອນດຽວໄດ້ໝົດທຸກລູກ
 */
export function blockNativeDrag() {
  return {
    onDragStart: (event: React.DragEvent) => event.preventDefault(),
  }
}
