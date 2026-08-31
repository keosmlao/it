import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMenuView } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { getIncident } from '@/lib/incidents/queries'
import {
  INCIDENT_SERVICE_LABEL_LO,
  INCIDENT_STATUS_LABEL_LO,
  INCIDENT_STATUS_STYLE,
  SEVERITY_SHORT_LO,
  SEVERITY_STYLE,
  formatDowntime,
  nowLocalInput,
} from '@/lib/incidents/model'
import { formatDateTime } from '@/lib/format'
import DocumentPanel from '@/components/document-panel'
import { listDocuments } from '@/lib/attachments/documents'
import ResolvePanel from './resolve-panel'

export default async function IncidentPage({ params }: PageProps<'/incidents/[id]'>) {
  const { id } = await params
  const user = await requireMenuView('/incidents')

  const incident = await getIncident(id)
  if (!incident) notFound()

  const editable = can.manageAssets(user)
  const documents = await listDocuments('incident', id)

  return (
    <div className="w-full">
      <p className="font-mono text-xs text-muted">{incident.code}</p>
      <h1 className="mt-1 text-xl font-semibold text-fg">{incident.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${INCIDENT_STATUS_STYLE[incident.status]}`}
        >
          {INCIDENT_STATUS_LABEL_LO[incident.status]}
        </span>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[incident.severity]}`}
        >
          {SEVERITY_SHORT_LO[incident.severity]}
        </span>
        <span className="text-sm text-muted">
          {INCIDENT_SERVICE_LABEL_LO[incident.service]}
        </span>
        {editable && (
          <Link
            href={`/incidents/${incident.id}/edit`}
            className="btn-secondary ml-auto rounded px-3 py-1.5 text-[13px]"
          >
            ແກ້ໄຂ
          </Link>
        )}
      </div>

      <div className="glass-card mt-5 grid gap-4 rounded-xl p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="ເລີ່ມລົ້ມ" value={formatDateTime(incident.started_at)} />
        <Info
          label="ກັບມາໃຊ້ໄດ້"
          value={incident.resolved_at ? formatDateTime(incident.resolved_at) : 'ຍັງລົ້ມຢູ່'}
        />
        <Info
          label={incident.resolved_at ? 'ລົ້ມທັງໝົດ' : 'ລົ້ມມາແລ້ວ'}
          value={formatDowntime(incident.minutes)}
        />
        <Info label="ຜູ້ແຈ້ງ" value={incident.reported_by ?? '—'} />
        {incident.subscription_name && (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted">ສັນຍາເຊົ່າທີ່ກ່ຽວຂ້ອງ</p>
            <Link
              href={`/subscriptions/${incident.subscription_id}`}
              className="text-sm text-brand-blue underline"
            >
              {incident.subscription_name}
            </Link>
          </div>
        )}
        {incident.asset_code && (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted">ອຸປະກອນ</p>
            <Link
              href={`/assets/${incident.asset_code}`}
              className="text-sm text-brand-blue underline"
            >
              {incident.asset_code} · {incident.asset_name ?? ''}
            </Link>
          </div>
        )}
        {incident.impact && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Info label="ຜົນກະທົບ" value={incident.impact} />
          </div>
        )}
      </div>

      <div className="glass-card mt-4 grid gap-4 rounded-xl p-5 sm:grid-cols-3">
        <Block title="ສາເຫດ" text={incident.cause} />
        <Block title="ແກ້ໄຂແນວໃດ" text={incident.action} />
        <Block title="ກັນບໍ່ໃຫ້ເກີດຄືນ" text={incident.prevention} />
      </div>

      {editable && incident.status === 'open' && (
        <ResolvePanel id={incident.id} now={nowLocalInput()} />
      )}

      <DocumentPanel
        entityType="incident"
        entityId={incident.id}
        documents={documents}
        editable={editable}
        hint="ຮູບໜ້າຈໍ · log · ໜັງສືຈາກຜູ້ໃຫ້ບໍລິການ"
      />

      <p className="mt-4 text-xs text-faint">
        ບັນທຶກໂດຍ {incident.created_by_name ?? '—'} ·{' '}
        {formatDateTime(incident.created_at)}
      </p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-body">{value}</p>
    </div>
  )
}

function Block({ title, text }: { title: string; text: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-body">
        {text || <span className="text-faint">ຍັງບໍ່ໄດ້ຂຽນ</span>}
      </p>
    </div>
  )
}
