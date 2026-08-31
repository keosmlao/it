import ActionForm from '@/components/action-form'
import { query } from '@/lib/db'
import { requireMenuView } from '@/lib/auth/session'
import { ROLES, ROLE_LABEL_LO, type Role } from '@/lib/auth/roles'
import PermissionGrid, { type PermissionRow } from '../permission-grid'
import { Panel } from '../panel'
import { setRoleOverride } from '../actions'

export const metadata = { title: 'ຈັດການສິດ' }

/** ສິດທົ່ວໄປ 9 ຂໍ້ ແລະ ບົດບາດ — ສິດລາຍເມນູຢູ່ໜ້າ /admin/permissions/[id] */
export default async function PermissionsPage() {
  await requireMenuView('/admin/permissions')

  const [staff, overrides, permissionRows] = await Promise.all([
    query<{
      employee_id: number
      employee_code: string
      fullname_lo: string
      role: Role
      unit_name_lo: string | null
    }>('select * from it.v_it_staff order by employee_code'),
    query<{ employee_id: number; role: string; note: string | null }>(
      'select employee_id, role, note from it.user_role_override'
    ),
    query<PermissionRow>(
      `select employee_id, permission, allowed
         from it.user_permissions
        where permission not like '/%'`
    ),
  ])

  const overrideBy = new Map(overrides.map((o) => [o.employee_id, o]))

  return (
    <div className="w-full space-y-4">
      <Panel
        title="ສິດທົ່ວໄປ"
        hint="ບົດບາດເປັນຄ່າຕັ້ງຕົ້ນ — ຕັ້ງທີ່ນີ້ເມື່ອຢາກເປີດ ຫຼື ຫ້າມສະເພາະບາງຂໍ້ໃຫ້ຄົນໃດຄົນໜຶ່ງ ໂດຍບໍ່ຕ້ອງປ່ຽນບົດບາດ · ກົດ &quot;ລາຍເມນູ →&quot; ເພື່ອຕັ້ງ ເບິ່ງ/ເພີ່ມ/ແກ້ໄຂ/ລົບ ຂອງແຕ່ລະເມນູ"
      >
        <PermissionGrid staff={staff} rows={permissionRows} />
      </Panel>

      <Panel
        title="ບົດບາດຜູ້ໃຊ້"
        hint="ໂດຍປົກກະຕິບົດບາດຄິດຈາກຕຳແໜ່ງ ແລະ ໜ່ວຍງານໃນຂໍ້ມູນ HR — ຕັ້ງທີ່ນີ້ເມື່ອຕ້ອງການຍົກເວັ້ນ"
      >
        <div className="space-y-2">
          {staff.map((s) => {
            const override = overrideBy.get(s.employee_id)

            return (
              <ActionForm
                key={s.employee_id}
                action={setRoleOverride}
                className="flex flex-wrap items-center gap-3"
              >
                <input type="hidden" name="employee_id" value={s.employee_id} />
                <span className="w-52 text-sm text-fg">
                  {s.fullname_lo}
                  <span className="ml-1 text-xs text-muted">{s.employee_code}</span>
                </span>
                <select
                  name="role"
                  defaultValue={override?.role ?? ''}
                  className="input rounded px-2 py-1 text-[13px]"
                >
                  <option value="">ຕາມ HR ({ROLE_LABEL_LO[s.role]})</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL_LO[r]}
                    </option>
                  ))}
                </select>
                <input
                  name="note"
                  defaultValue={override?.note ?? ''}
                  placeholder="ເຫດຜົນ"
                  className="input w-52 rounded px-2 py-1 text-[13px]"
                />
                <button
                  type="submit"
                  className="btn-secondary rounded px-3 py-1.5 text-[13px]"
                >
                  ບັນທຶກ
                </button>
              </ActionForm>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
