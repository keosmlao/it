'use client'

import { useRef, useState } from 'react'

/**
 * ຊ່ອງເລືອກຮູບພ້ອມສະແດງຕົວຢ່າງກ່ອນສົ່ງ.
 * ຮູບຖືກສົ່ງໄປກັບຟອມໃນຊື່ `images` (ຫຼາຍໄຟລ໌).
 */
export default function ImagePicker({
  label = 'ແນບຮູບ',
  hint,
  required = false,
  max = 5,
}: {
  label?: string
  hint?: string
  required?: boolean
  max?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([])

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]

    // ປ່ອຍ URL ເກົ່າກ່ອນສ້າງອັນໃໝ່ ບໍ່ໃຫ້ຮົ່ວໜ່ວຍຄວາມຈຳ
    setPreviews((old) => {
      old.forEach((p) => URL.revokeObjectURL(p.url))
      return files.slice(0, max).map((f) => ({
        url: URL.createObjectURL(f),
        name: f.name,
      }))
    })
  }

  return (
    <div>
      <span className="text-sm font-medium text-body">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        name="images"
        accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
        multiple
        required={required}
        onChange={onChange}
        className="mt-1.5 block w-full cursor-pointer text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-blue/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-blue hover:file:bg-brand-blue/20"
      />

      {previews.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {previews.map((p) => (
            <li key={p.url} className="w-24">
              {/* ຕົວຢ່າງໃນເຄື່ອງ — ໃຊ້ <img> ເພາະ blob: ຜ່ານ next/image ບໍ່ໄດ້ */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.name}
                className="h-20 w-24 rounded-lg border border-line object-cover"
              />
              <span className="mt-1 block truncate text-[11px] text-muted">
                {p.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
