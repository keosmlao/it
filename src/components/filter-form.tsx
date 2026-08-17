'use client'

import { useRef } from 'react'

/**
 * ຟອມກັ່ນຕອງທີ່ສົ່ງເອງທັນທີເມື່ອປ່ຽນ dropdown ຫຼື ຕິກກ່ອງ
 *
 * ເຫດຜົນ: ເລືອກແລ້ວຍັງຕ້ອງກົດ "ກັ່ນຕອງ" ອີກເທື່ອ ເປັນຂັ້ນຕອນທີ່ຄົນລືມປະຈຳ
 * ແລ້ວນຶກວ່າຕົວກອງເພ. ຊ່ອງພິມບໍ່ສົ່ງເອງ (ຈະສົ່ງທຸກຕົວອັກສອນ) — ກົດ Enter
 * ຫຼື ປຸ່ມເອົາ ເຊິ່ງເປັນເສັ້ນທາງດຽວກັນກັບຕອນ JS ບໍ່ແລ່ນ
 */
export default function FilterForm({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const form = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={form}
      role="search"
      className={className}
      onChange={(event) => {
        const target = event.target
        const auto =
          target instanceof HTMLSelectElement ||
          (target instanceof HTMLInputElement && target.type === 'checkbox')
        if (auto) form.current?.requestSubmit()
      }}
    >
      {children}
    </form>
  )
}
