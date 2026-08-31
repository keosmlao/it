import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import {
  can,
  MODULE_ACTION_HINT_LO,
  MODULE_ACTION_LABEL_LO,
  MODULE_ACTIONS,
  MODULES,
  ROLE_LABEL_LO,
  roleAllowsModule,
  type ModuleAction,
  type ModuleCode,
  type Role,
} from '@/lib/auth/roles'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { setModulePermissions } from '../../actions'

export const dynamic = 'force-dynamic'

/**
 * ຕັ້ງສິດລາຍໂມດູນຂອງຄົນໜຶ່ງ — ແຖວ = ໂມດູນ, ຖັນ = ເບິ່ງ/ເພີ່ມ/ແກ້ໄຂ/ລົບ
 *
 * ແຍກເປັນໜ້າຕໍ່ຄົນ ບໍ່ແມ່ນຕາຕະລາງລວມ ເພາະ 14 ໂມດູນ × 4 ການກະທຳ = 56 ຊ່ອງ
 * ຕໍ່ຄົນ — ໃສ່ໃນຕາຕະລາງລວມແລ້ວກາຍເປັນ 56 ຖັນ ເລື່ອນຫາບໍ່ພົບ
 */
export default async function ModulePermissionPage({
  params,
}: PageProps<'/admin/permissions/[id]'>) {
  const user = await requireUser()
  if (!can.administer(user)) redirect('/')

  const { id } = await params
  const employeeId = Number(id)
  if (!Number.isInteger(employeeId)) notFound()

  const [target] = await query<{
    employee_id: number
    employee_code: string
    fullname_lo: string
    role: Role
    unit_name_lo: string | null
  }>(
    `select v.employee_id, v.employee_code, v.fullname_lo, v.role, v.unit_name_lo
       from it.v_it_staff v
      where v.employee_id = $1::int`,
    [employeeId]
  )
  if (!target) notFound()

  const rows = await query<{ permission: string; allowed: boolean }>(
    `select permission, allowed
       from it.user_permissions
      where employee_id = $1::int and permission like '%.%'`,
    [employeeId]
  )
  const override = new Map(rows.map((r) => [r.permission, r.allowed]))

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <p className="text-sm text-muted">
          <span className="font-medium text-fg">{target.fullname_lo}</span>{' '}
          {target.employee_code} · {ROLE_LABEL_LO[target.role]}
          {target.unit_name_lo && ` · ${target.unit_name_lo}`}
        </p>
        <Link href="/admin" className="btn-secondary rounded px-3 py-1.5 text-[13px]">
          ← ກັບໜ້າຕັ້ງຄ່າ
        </Link>
      </div>

      <p className="mt-3 text-xs text-muted">
        ຊ່ອງທີ່ປະໄວ້ <span className="text-fg">ຕາມບົດບາດ</span> ຈະປ່ຽນຕາມ
        {ROLE_LABEL_LO[target.role]}ອັດຕະໂນມັດ — ຕັ້ງເປັນ ອະນຸຍາດ ຫຼື ຫ້າມ
        ສະເພາະຂໍ້ທີ່ຢາກໃຫ້ຕ່າງຈາກບົດບາດ. ປິດ &quot;ເບິ່ງ&quot; ແລ້ວ
        ເມນູຫາຍ ແລະ ເຮັດຫຍັງໃນໂມດູນນັ້ນບໍ່ໄດ້ເລີຍ.
      </p>

      <ActionForm action={setModulePermissions} className="mt-3">
        <input type="hidden" name="employee_id" value={employeeId} />

        <div className="o-list-wrap mt-2 overflow-x-auto">
          <table className="o-list w-full min-w-[640px] text-[13px]">
            <thead>
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">ໂມດູນ</th>
                {MODULE_ACTIONS.map((a: ModuleAction) => (
                  <th
                    key={a}
                    title={MODULE_ACTION_HINT_LO[a]}
                    className="cursor-help px-3 py-1.5 text-left font-medium"
                  >
                    {MODULE_ACTION_LABEL_LO[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODULES.map((m) => (
                <tr key={m.code} className="hover-surface transition">
                  <td className="px-3 py-1.5">
                    <span className="text-fg">{m.label}</span>
                    <span className="ml-1.5 font-mono text-xs text-faint">
                      {m.path}
                    </span>
                  </td>

                  {MODULE_ACTIONS.map((a: ModuleAction) => {
                    const key = `${m.code}.${a}`
                    const current = override.get(key)
                    const byRole = roleAllowsModule(
                      target.role,
                      m.code as ModuleCode,
                      a
                    )

                    return (
                      <td key={a} className="px-3 py-1.5">
                        <select
                          name={`m_${m.code}_${a}`}
                          defaultValue={
                            current === undefined ? '' : current ? 'allow' : 'deny'
                          }
                          className="input w-full rounded px-1 py-1 text-xs"
                        >
                          <option value="">
                            ຕາມບົດບາດ ({byRole ? '✓' : '✗'})
                          </option>
                          <option value="allow">✓ ອະນຸຍາດ</option>
                          <option value="deny">✗ ຫ້າມ</option>
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SubmitButton className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium">
            ບັນທຶກສິດ
          </SubmitButton>
          <input
            name="note"
            maxLength={200}
            placeholder="ໝາຍເຫດ (ເປັນຫຍັງຈຶ່ງຕັ້ງແບບນີ້)"
            className="input w-72 rounded px-2 py-1 text-[13px]"
          />
          <span className="text-xs text-muted">
            ຕັ້ງເອງຢູ່ {override.size} ຂໍ້
          </span>
        </div>
      </ActionForm>
    </div>
  )
}
