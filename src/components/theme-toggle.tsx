'use client'

import { useSyncExternalStore } from 'react'

/**
 * ສະຫຼັບໂໝດແຈ້ງ/ມືດ. ຄ່າທີ່ເລືອກເກັບໄວ້ໃນ localStorage ແລະ ຖືກອ່ານຄືນ
 * ໂດຍສະຄຣິບໃນ root layout ກ່ອນ render ເພື່ອບໍ່ໃຫ້ໜ້າຈໍກະພິບ.
 *
 * ແຫຼ່ງຄວາມຈິງຄື class ເທິງ <html> ຈຶ່ງອ່ານມັນໂດຍກົງແທນທີ່ຈະເກັບ state ຊ້ຳ.
 */
export default function ThemeToggle({
  variant = 'default',
}: {
  variant?: 'default' | 'sidebar' | 'navbar'
}) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false)

  function toggle() {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // ໂໝດສ່ວນຕົວຂອງ browser ອາດປິດ localStorage — ບໍ່ເປັນຫຍັງ
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'ປ່ຽນເປັນໂໝດແຈ້ງ' : 'ປ່ຽນເປັນໂໝດມືດ'}
      className={
        variant === 'sidebar'
          ? 'sidebar-link flex size-8 items-center justify-center rounded'
          : variant === 'navbar'
            ? 'flex size-8 items-center justify-center rounded hover:bg-white/10'
            : 'btn-secondary flex size-8 items-center justify-center rounded'
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[18px]"
        aria-hidden="true"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  )
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark')
}
