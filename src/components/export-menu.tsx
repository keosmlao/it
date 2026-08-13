'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * ປຸ່ມດຶງຂໍ້ມູນອອກ — Excel / CSV / PDF.
 * ໃຊ້ <a download> ທຳມະດາ ຈຶ່ງບໍ່ຕ້ອງໂຫຼດໄຟລ໌ເຂົ້າ memory ຂອງ browser
 */
export default function ExportMenu({
  dataset,
  query = {},
  label = 'ດຶງຂໍ້ມູນອອກ',
}: {
  dataset: string
  query?: Record<string, string | undefined>
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const href = (format: string) => {
    const search = new URLSearchParams({ format })
    for (const [k, v] of Object.entries(query)) if (v) search.set(k, v)
    return `/api/export/${dataset}?${search}`
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary rounded-lg px-4 py-2 text-sm"
      >
        ↓ {label}
      </button>

      {open && (
        <div className="glass-heavy absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg py-1 shadow-lg">
          {[
            { format: 'xlsx', label: 'Excel (.xlsx)' },
            { format: 'csv', label: 'CSV' },
            { format: 'pdf', label: 'PDF (ພິມ)' },
          ].map((item) => (
            <a
              key={item.format}
              href={href(item.format)}
              download
              onClick={() => setOpen(false)}
              className="hover-surface block px-4 py-2 text-sm text-body transition"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
