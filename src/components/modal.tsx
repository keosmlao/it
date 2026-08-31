'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

/**
 * ຕົວປິດໜ້າຕ່າງ — ຟອມທີ່ຢູ່ໃນ modal ດຶງເອົາເອງໄດ້
 *
 * ເປັນ context ບໍ່ແມ່ນ prop ເພາະໜ້າ (Server Component) ສົ່ງ function
 * ໃຫ້ client component ບໍ່ໄດ້. ຄ່າຕັ້ງຕົ້ນບໍ່ເຮັດຫຍັງ ຟອມຈຶ່ງໃຊ້ຢູ່ນອກ
 * modal ໄດ້ຄືເກົ່າ
 */
const CloseModal = createContext<() => void>(() => {})

export function useModalClose() {
  return useContext(CloseModal)
}

/**
 * ໜ້າຕ່າງລອຍ — ຂຽນດ້ວຍ div ທຳມະດາ
 *
 * ເມື່ອກ່ອນໃຊ້ <dialog> + showModal() ຂອງ browser ເພື່ອໄດ້ Esc ແລະ focus trap
 * ມາຟຣີ ແຕ່ພິສູດແລ້ວວ່າມັນບໍ່ໂຜ່ຂຶ້ນມາໃນສະພາບຈິງ ແລ້ວຫາສາເຫດບໍ່ໄດ້ —
 * ຜົນຄືກົດປຸ່ມ ຫຼື ລາກກາດແລ້ວ "ບໍ່ມີຫຍັງເກີດຂຶ້ນ". ອັນນີ້ overlay ທຳມະດາ
 * ຄຸມທຸກຢ່າງເອງ ຈຶ່ງແນ່ນອນວ່າເຫັນ (Esc ແລະ ກົດພື້ນຫຼັງເຮັດເອງ)
 */
export default function Modal({
  trigger,
  triggerClassName = 'btn-primary rounded px-3 py-1.5 text-[13px] font-medium',
  title,
  children,
  open: openProp,
  onClose,
}: {
  /** ບໍ່ໃສ່ = ບໍ່ມີປຸ່ມ ໃຫ້ຄຸມດ້ວຍ `open` ເອງ (ເຊັ່ນ ເປີດຫຼັງລາກກາດ) */
  trigger?: React.ReactNode
  triggerClassName?: string
  title: string
  children: React.ReactNode
  /** ໃສ່ມາ = ຜູ້ເອີ້ນຄຸມການເປີດ–ປິດເອງ */
  open?: boolean
  onClose?: () => void
}) {
  const [openState, setOpenState] = useState(false)

  const controlled = openProp !== undefined
  const open = controlled ? openProp : openState

  // ຄົງ identity ໄວ້ — ຟອມອາດເອົາໄປໃສ່ dependency ຂອງ useEffect
  const close = useCallback(() => {
    if (controlled) onClose?.()
    else setOpenState(false)
  }, [controlled, onClose])

  // Esc ປິດ ແລະ ກັນໜ້າຫຼັງເລື່ອນຂະນະເປີດ
  useEffect(() => {
    if (!open) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, close])

  return (
    <>
      {trigger !== undefined && (
        <button
          type="button"
          onClick={() => setOpenState(true)}
          className={triggerClassName}
        >
          {trigger}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          // ກົດພື້ນຫຼັງ (ບໍ່ແມ່ນແຜງ) = ປິດ
          onClick={(event) => {
            if (event.target === event.currentTarget) close()
          }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
        >
          <div className="my-auto w-[min(46rem,94vw)] rounded-2xl glass-heavy p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-fg">{title}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="ປິດ"
                className="-mt-1 rounded-lg px-2 text-2xl leading-none text-muted transition hover:text-fg"
              >
                ×
              </button>
            </div>

            <CloseModal.Provider value={close}>{children}</CloseModal.Provider>
          </div>
        </div>
      )}
    </>
  )
}
