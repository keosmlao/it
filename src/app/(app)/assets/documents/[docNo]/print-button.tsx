'use client'

/** ພິມເອກະສານ — ຂໍ້ຄວາມນອກກ່ອງເອກະສານຖືກເຊື່ອງດ້ວຍ class print:hidden */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary flex items-center gap-2 rounded px-3 py-1.5 text-[13px]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden="true"
      >
        <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8v-7Z" />
      </svg>
      ພິມເອກະສານ
    </button>
  )
}
