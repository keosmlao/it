import Link from 'next/link'
import ActionForm, { SubmitButton } from '@/components/action-form'
import {
  PERMISSIONS,
  PERMISSION_HINT_LO,
  PERMISSION_LABEL_LO,
  PERMISSION_SHORT_LO,
  ROLE_LABEL_LO,
  roleAllows,
  type Permission,
  type Role,
} from '@/lib/auth/roles'
import { setUserPermissions } from './actions'
import { permissionScopes } from './permission-menus'

export type PermissionRow = {
  employee_id: number
  permission: string
  allowed: boolean
}

export type StaffRow = {
  employee_id: number
  employee_code: string
  fullname_lo: string
  role: Role
  unit_name_lo: string | null
}

// ຄວາມກ້ວາງຖັນຕ້ອງກົງກັນລະຫວ່າງຫົວຕາຕະລາງ ແລະ ທຸກແຖວ.
// ຂຽນເລກ 9 ຕາຍຕົວເພາະ Tailwind ອ່ານ class ຈາກຂໍ້ຄວາມໃນໄຟລ໌ —
// ຖ້າສ້າງດ້ວຍ template literal ມັນຈະຫາ class ນີ້ບໍ່ພົບ ແລ້ວບໍ່ອອກ CSS ໃຫ້
const COLS =
  'grid grid-cols-[minmax(190px,1.4fr)_repeat(9,minmax(104px,1fr))_minmax(80px,auto)] items-center gap-x-2'

// ຖ້າເພີ່ມສິດໃໝ່ ຕ້ອງແກ້ເລກຂ້າງເທິງນຳ — ບັນທັດນີ້ຈະຟ້ອງຕອນ build
const _COLUMN_COUNT_MATCHES: 9 = PERMISSIONS.length

/**
 * ຕາຕະລາງສິດ — ແຖວ = ຄົນ, ຖັນ = ສິດ
 *
 * ແຕ່ລະຊ່ອງມີ 3 ຄ່າ: ຕາມບົດບາດ / ອະນຸຍາດ / ຫ້າມ.
 * "ຫ້າມ" ຈຳເປັນຕ່າງຫາກຈາກ "ຕາມບົດບາດ" ເພາະຕ້ອງປິດສິດຄົນໃດຄົນໜຶ່ງໄດ້
 * ທັງທີ່ບົດບາດເປີດໃຫ້ — ບໍ່ດັ່ງນັ້ນຕ້ອງລົດບົດບາດລົງທັງກ້ອນ
 *
 * ໃຊ້ grid ບໍ່ແມ່ນ <table> ເພາະ <form> ເປັນລູກຂອງ <tr> ບໍ່ໄດ້ —
 * ແຕ່ລະແຖວຕ້ອງເປັນຟອມຂອງຕົນເອງ ຈຶ່ງບັນທຶກແຍກຄົນໄດ້
 */
export default function PermissionGrid({
  staff,
  rows,
}: {
  staff: StaffRow[]
  rows: PermissionRow[]
}) {
  const scopes = permissionScopes()

  const tooltip = (p: Permission) =>
    [
      PERMISSION_LABEL_LO[p],
      PERMISSION_HINT_LO[p],
      scopes[p].menus.length ? `ເມນູ: ${scopes[p].menus.join(', ')}` : '',
      ...scopes[p].extra,
    ]
      .filter(Boolean)
      .join('\n')

  const byUser = new Map<number, Map<string, boolean>>()
  for (const r of rows) {
    const m = byUser.get(r.employee_id) ?? new Map<string, boolean>()
    m.set(r.permission, r.allowed)
    byUser.set(r.employee_id, m)
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <div className="min-w-[1000px]">
        <div className={`${COLS} border-b border-line pb-2`}>
          <span className="text-xs font-medium text-muted">ຜູ້ໃຊ້</span>
          {PERMISSIONS.map((p: Permission) => (
            <span
              key={p}
              title={tooltip(p)}
              className="cursor-help text-center text-xs font-medium text-muted"
            >
              {PERMISSION_SHORT_LO[p]}
            </span>
          ))}
          <span />
        </div>

        {staff.map((s) => {
          const set = byUser.get(s.employee_id)
          const custom = set?.size ?? 0

          return (
            <ActionForm
              key={s.employee_id}
              action={setUserPermissions}
              className="border-b border-line/60 py-2"
            >
              <input type="hidden" name="employee_id" value={s.employee_id} />

              <div className={COLS}>
                <div className="min-w-0">
                  <div className="truncate text-sm text-fg">
                    {s.fullname_lo}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {s.employee_code} · {ROLE_LABEL_LO[s.role]}
                    {custom > 0 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        · ຕັ້ງເອງ {custom}
                      </span>
                    )}
                  </div>
                </div>

                {PERMISSIONS.map((p: Permission) => {
                  const override = set?.get(p)
                  const byRole = roleAllows(s.role, p)

                  return (
                    <select
                      key={p}
                      name={`perm_${p}`}
                      defaultValue={
                        override === undefined ? '' : override ? 'allow' : 'deny'
                      }
                      title={`${s.fullname_lo}\n${tooltip(p)}`}
                      className="input w-full rounded-md px-1 py-1 text-xs"
                    >
                      <option value="">ຕາມບົດບາດ ({byRole ? '✓' : '✗'})</option>
                      <option value="allow">✓ ອະນຸຍາດ</option>
                      <option value="deny">✗ ຫ້າມ</option>
                    </select>
                  )
                })}

                <div className="flex items-center justify-end gap-1.5">
                  <SubmitButton className="btn-secondary rounded px-3 py-1.5 text-xs">
                    ບັນທຶກ
                  </SubmitButton>
                  <Link
                    href={`/admin/permissions/${s.employee_id}`}
                    title="ຕັ້ງ ເບິ່ງ/ເພີ່ມ/ແກ້ໄຂ/ລົບ ເປັນລາຍໂມດູນ"
                    className="btn-secondary rounded px-2 py-1.5 text-xs whitespace-nowrap"
                  >
                    ລາຍໂມດູນ →
                  </Link>
                </div>
              </div>
            </ActionForm>
          )
        })}

        {/* ---------- ບອກວ່າແຕ່ລະສິດຄຸມເມນູໃດ ---------- */}
        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
          {PERMISSIONS.map((p: Permission) => (
            <div key={p} className="text-xs">
              <dt className="font-medium text-fg">
                {PERMISSION_SHORT_LO[p]}
                <span className="ml-1 font-normal text-muted">
                  — {PERMISSION_LABEL_LO[p]}
                </span>
              </dt>
              <dd className="mt-0.5 text-muted">
                {scopes[p].menus.length > 0 && (
                  <span>
                    <span className="text-faint">ເມນູ:</span>{' '}
                    {scopes[p].menus.join(' · ')}
                  </span>
                )}
                {scopes[p].menus.length > 0 && scopes[p].extra.length > 0 && (
                  <span className="text-faint"> | </span>
                )}
                {scopes[p].extra.join(' · ')}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
