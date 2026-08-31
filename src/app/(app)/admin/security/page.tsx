import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { can, ROLE_LABEL_LO, type Role } from '@/lib/auth/roles'
import {
  FORMAT_LABEL_LO,
  FORMAT_RISK,
  getAdminGrants,
  getFailedLogins,
  getItStaffPasswordRisk,
  getPasswordFormats,
  getSecuritySummary,
  getSessionStats,
} from '@/lib/auth/security-audit'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'ກວດຄວາມປອດໄພ' }

const RISK_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-brand-orange/20 text-brand-orange',
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
}

export default async function SecurityPage() {
  const user = await requireUser()
  if (!can.administer(user)) notFound()

  const [formats, itStaff, admins, sessions, failed, summary] = await Promise.all([
    getPasswordFormats(),
    getItStaffPasswordRisk(),
    getAdminGrants(),
    getSessionStats(),
    getFailedLogins(7),
    getSecuritySummary(),
  ])

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          ໜ້ານີ້<strong>ອ່ານຢ່າງດຽວ</strong> — ບໍ່ໄດ້ແກ້ຫຍັງໃນທະບຽນ HR
          ເອົາໄວ້ເປັນຫຼັກຖານໄປລົມກັບເຈົ້າຂອງລະບົບ
        </p>
        <Link href="/admin" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ← ຕັ້ງຄ່າລະບົບ
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat
          label="ພະນັກງານ IT ທີ່ລະຫັດຜ່ານບໍ່ໄດ້ເຂົ້າລະຫັດ"
          value={summary?.weak_it_passwords ?? '0'}
          danger={Number(summary?.weak_it_passwords ?? 0) > 0}
        />
        <Stat
          label="ບັນຊີໃນລະບົບອື່ນທີ່ຄວນປິດ"
          value={summary?.closable_accounts ?? '0'}
          danger={Number(summary?.closable_accounts ?? 0) > 0}
          href="/accounts?state=closable&status=all"
        />
        <Stat
          label="ຄົນທີ່ອອກແລ້ວແຕ່ຍັງມີ session ເປີດ"
          value={summary?.inactive_with_session ?? '0'}
          danger={Number(summary?.inactive_with_session ?? 0) > 0}
        />
      </div>

      <Panel title="ຮູບແບບລະຫັດຜ່ານຂອງພະນັກງານທີ່ໃຊ້ງານຢູ່">
        <p className="px-4 pt-3 text-xs text-muted">
          ⚠️ ບໍ່ສະແດງລະຫັດຜ່ານຈິງ — ສະແດງແຕ່ຮູບແບບການເກັບ
        </p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-2">ຮູບແບບ</th>
              <th className="px-4 py-2 text-right">ທັງບໍລິສັດ</th>
              <th className="px-4 py-2 text-right">ພະແນກ IT</th>
              <th className="px-4 py-2">ຄວາມສ່ຽງ</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {formats.map((f) => (
              <tr key={f.format}>
                <td className="px-3 py-1.5 text-fg">
                  {FORMAT_LABEL_LO[f.format] ?? f.format}
                </td>
                <td className="px-3 py-1.5 text-right text-body">{f.total}</td>
                <td className="px-3 py-1.5 text-right text-body">{f.it_staff}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      RISK_STYLE[FORMAT_RISK[f.format] ?? 'medium']
                    }`}
                  >
                    {FORMAT_RISK[f.format] === 'ok'
                      ? 'ປອດໄພ'
                      : FORMAT_RISK[f.format] === 'high'
                        ? 'ສູງ'
                        : 'ປານກາງ'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title={`ພະນັກງານ IT ລາຍຄົນ (${itStaff.length} ຄົນ)`}>
        <p className="px-4 pt-3 text-xs text-muted">
          ຄົນກຸ່ມນີ້ມີສິດສູງທີ່ສຸດໃນລະບົບ ຈຶ່ງເປັນເປົ້າໝາຍທຳອິດຖ້າມີຄົນຢາກເຂົ້າ
        </p>
        <div className="divide-line mt-2 divide-y">
          {itStaff.map((s) => (
            <div key={s.employee_code} className="flex flex-wrap items-center gap-3 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">{s.fullname_lo}</span>
                <span className="text-xs text-muted">
                  {ROLE_LABEL_LO[s.role as Role] ?? s.role} · ຄວາມຍາວ {s.length} ຕົວ
                </span>
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  RISK_STYLE[FORMAT_RISK[s.format] ?? 'medium']
                }`}
              >
                {FORMAT_LABEL_LO[s.format] ?? s.format}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="ສິດ administer ທີ່ຕັ້ງລາຍຄົນ">
        <div className="divide-line divide-y">
          {admins.map((a) => (
            <div key={a.employee_code} className="flex flex-wrap items-center gap-3 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-fg">{a.employee_name}</span>
              <span className="text-xs text-muted">
                ຕັ້ງໂດຍ {a.updated_by_name ?? '—'} · {formatDateTime(a.updated_at)}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.allowed ? RISK_STYLE.medium : RISK_STYLE.ok
                }`}
              >
                {a.allowed ? 'ອະນຸຍາດ' : 'ຫ້າມ'}
              </span>
            </div>
          ))}
          {admins.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              ບໍ່ມີການຕັ້ງລາຍຄົນ — ໃຊ້ຕາມບົດບາດທັງໝົດ (ຜູ້ຈັດການເທົ່ານັ້ນ)
            </p>
          )}
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Session ທີ່ຍັງເປີດຢູ່" flush>
          <dl className="space-y-2 px-4 py-4 text-sm">
            <Row label="ຈຳນວນ session" value={sessions?.active ?? '0'} />
            <Row label="ຈຳນວນຄົນ" value={sessions?.people ?? '0'} />
            <Row
              label="ເປີດມາເກີນ 1 ມື້"
              value={sessions?.long_lived ?? '0'}
              note="session ຕັ້ງໃຫ້ໝົດອາຍຸໃນ 8 ຊົ່ວໂມງ"
            />
            <Row
              label="ອັນເກົ່າສຸດ"
              value={sessions?.oldest ? formatDateTime(sessions.oldest) : '—'}
            />
          </dl>
        </Panel>

        <Panel title="Login ລົ້ມເຫຼວ 7 ມື້ຫຼ້າສຸດ (ຕັ້ງແຕ່ 3 ຄັ້ງຂຶ້ນໄປ)" flush>
          <div className="divide-line divide-y">
            {failed.map((f) => (
              <div key={f.employee_code} className="flex flex-wrap items-center gap-3 px-3 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm text-fg">
                    {f.employee_code}
                  </span>
                  <span className="text-xs text-muted">{f.reasons}</span>
                </span>
                <span className="text-sm text-body">{f.attempts} ຄັ້ງ</span>
                <span className="text-xs text-faint">{formatDateTime(f.last_at)}</span>
              </div>
            ))}
            {failed.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                ບໍ່ມີການ login ລົ້ມເຫຼວຜິດປົກກະຕິ
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="glass-card mt-5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-fg">ຄວນເຮັດຫຍັງຕໍ່</h2>
        <ol className="mt-2 space-y-2 text-sm text-body">
          <li>
            1. ຕົກລົງກັບເຈົ້າຂອງລະບົບ HR ກ່ອນ — ຄໍລຳ <code>password</code> ນັ້ນ
            ແອັບອື່ນໃຊ້ຮ່ວມ ປ່ຽນຝ່າຍດຽວແລ້ວລະບົບອື່ນອາດ login ບໍ່ໄດ້
          </li>
          <li>
            2. ເລີ່ມຈາກພະນັກງານ IT ກ່ອນ (ຄົນທີ່ມີສິດສູງສຸດ) ແລ້ວຄ່ອຍຂະຫຍາຍອອກ
          </li>
          <li>3. ບັງຄັບຄວາມຍາວຂັ້ນຕ່ຳ ແລະ ປ່ຽນເປັນ scrypt ໃຫ້ໝົດ</li>
          <li>
            4. ປິດບັນຊີຂອງຄົນທີ່ອອກໄປແລ້ວ —{' '}
            <Link href="/accounts?state=closable&status=all" className="text-brand-blue underline">
              ເບິ່ງລາຍການ
            </Link>
          </li>
        </ol>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  danger,
  href,
}: {
  label: string
  value: string
  danger?: boolean
  href?: string
}) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          danger ? 'text-red-600 dark:text-red-400' : 'text-fg'
        }`}
      >
        {value}
      </p>
    </>
  )

  return href ? (
    <Link href={href} className="glass-card hover-surface rounded-xl p-4 transition">
      {body}
    </Link>
  ) : (
    <div className="glass-card rounded-xl p-4">{body}</div>
  )
}

function Panel({
  title,
  children,
  flush = false,
}: {
  title: string
  children: React.ReactNode
  flush?: boolean
}) {
  return (
    <section className={`glass-card mt-4 rounded-xl ${flush ? '' : 'overflow-x-auto'}`}>
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">
        <span className="text-body">{value}</span>
        {note && <span className="block text-xs text-faint">{note}</span>}
      </dd>
    </div>
  )
}
