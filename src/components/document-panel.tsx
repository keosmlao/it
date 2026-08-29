'use client'

import ActionForm, { SubmitButton } from '@/components/action-form'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { DocEntity, Document } from '@/lib/attachments/documents'
import { deleteDocument, uploadDocuments } from '@/app/(app)/document-actions'

/**
 * ເອກະສານແນບ — ໃຊ້ຮ່ວມກັນທຸກໂມດູນ
 *
 * PDF ບໍ່ມີຮູບຕົວຢ່າງ ຈຶ່ງສະແດງເປັນລາຍການແທນຕາຕະລາງຮູບ —
 * ສ່ວນຫຼາຍທີ່ແນບຢູ່ນີ້ແມ່ນສັນຍາ ແລະ ໃບບິນ ບໍ່ແມ່ນຮູບໜ້າຈໍ
 */
export default function DocumentPanel({
  entityType,
  entityId,
  documents,
  editable,
  title = 'ເອກະສານແນບ',
  hint,
}: {
  entityType: DocEntity
  entityId: string
  documents: Document[]
  editable: boolean
  title?: string
  hint?: string
}) {
  return (
    <div className="glass-card mt-4 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">
          {title} ({documents.length})
        </h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>

      <ul className="divide-line divide-y">
        {documents.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span aria-hidden="true" className="text-lg">
              {d.mime_type === 'application/pdf' ? '📄' : '🖼️'}
            </span>

            <a
              href={`/api/attachments/${d.id}`}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-brand-blue hover:underline"
            >
              {d.file_name}
            </a>

            <span className="text-xs text-muted">{formatBytes(d.size_bytes)}</span>
            <span className="text-xs text-faint">
              {d.uploaded_by_nickname ?? d.uploaded_by_name} ·{' '}
              {formatDateTime(d.created_at)}
            </span>

            {editable && (
              <ActionForm action={deleteDocument}>
                <input type="hidden" name="entity_type" value={entityType} />
                <input type="hidden" name="id" value={d.id} />
                <SubmitButton
                  className="rounded-lg px-3 py-1 text-xs text-muted hover:text-red-600"
                  pendingLabel="…"
                >
                  ລຶບ
                </SubmitButton>
              </ActionForm>
            )}
          </li>
        ))}

        {documents.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">
            ຍັງບໍ່ມີເອກະສານແນບ
          </li>
        )}
      </ul>

      {editable && (
        <ActionForm
          action={uploadDocuments}
          className="border-t border-line px-4 py-3"
        >
          <input type="hidden" name="entity_type" value={entityType} />
          <input type="hidden" name="entity_id" value={entityId} />

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              name="files"
              multiple
              accept="application/pdf,image/*"
              className="block w-full text-sm text-body file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue/10 file:px-3 file:py-2 file:text-sm file:text-brand-blue"
            />
            <SubmitButton
              className="btn-secondary rounded-lg px-4 py-2 text-sm"
              pendingLabel="ກຳລັງອັບໂຫລດ…"
            >
              ແນບເອກະສານ
            </SubmitButton>
          </div>

          <p className="mt-2 text-xs text-faint">
            PDF ຫຼື ຮູບ · ສູງສຸດ 5 ໄຟລ໌ຕໍ່ຄັ້ງ · 20MB ຕໍ່ໄຟລ໌
          </p>
        </ActionForm>
      )}
    </div>
  )
}
