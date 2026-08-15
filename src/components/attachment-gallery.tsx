import { formatBytes, formatDateTime } from '@/lib/format'
import type { Attachment } from '@/lib/tickets/attachments'

/**
 * ຮູບແນບຂອງ ticket. ຮູບເສີບຜ່ານ /api/attachments/[id] ທີ່ກວດສິດແລ້ວ
 * ຈຶ່ງໃຊ້ <img> ທຳມະດາ (next/image ຕ້ອງການ URL ທີ່ optimize ໄດ້).
 */
export default function AttachmentGallery({
  attachments,
  emptyText,
}: {
  attachments: Attachment[]
  emptyText: string
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted">{emptyText}</p>
  }

  return (
    <ul className="flex flex-wrap gap-3">
      {attachments.map((a) => (
        <li key={a.id} className="w-32">
          <a
            href={`/api/attachments/${a.id}`}
            target="_blank"
            rel="noreferrer"
            title={`${a.file_name} · ${formatBytes(a.size_bytes)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/attachments/${a.id}`}
              alt={a.file_name}
              loading="lazy"
              className="h-24 w-32 rounded-lg border border-line object-cover transition hover:brightness-110"
            />
          </a>
          <span className="mt-1 block truncate text-[11px] text-muted">
            {a.uploaded_by_nickname ?? a.uploaded_by_name}
          </span>
          <span className="block truncate text-[11px] text-faint">
            {formatDateTime(a.created_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}
