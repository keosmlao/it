import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { can, roleAllows, ROLE_LABEL_LO, type Role } from '@/lib/auth/roles'
import {
  MENU_ACTION_HINT_LO,
  MENU_ACTION_LABEL_LO,
  MENU_ACTIONS,
  MENU_PERMS,
  roleAllowsMenu,
  type MenuAction,
} from '@/lib/auth/menu-perms'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { setMenuPermissions } from '../../actions'

export const dynamic = 'force-dynamic'

/**
 * ຕັ້ງສິດຂອງຄົນໜຶ່ງ — ແຖວ = **ເມນູທີ່ເຂົາເຫັນຢູ່ sidebar**, ຖັນ = ການກະທຳ
 *
 * ຮຽງ ແລະ ຍໍ້ໜ້າຕາມ sidebar ຈິງ ຈຶ່ງຊີ້ໄດ້ເລີຍວ່າ "ເມນູນີ້ ເຂົາເຮັດຫຍັງໄດ້"
 * ຊ່ອງທີ່ເມນູນັ້ນບໍ່ມີການກະທຳນັ້ນຈະເປັນ "–" ບໍ່ແມ່ນຕົວເລືອກຫຼອກ
 */
export default async function MenuPermissionPage({
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
      where employee_id = $1::int and permission like '/%'`,
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
        ແຖວ = ເມນູທີ່ເຫັນຢູ່ເບື້ອງຊ້າຍ · <span className="text-fg">ຕິກ</span> =
        ເຮັດໄດ້ · ບໍ່ຕິກ = ເຮັດບໍ່ໄດ້ · &quot;–&quot; = ເມນູນັ້ນບໍ່ມີການກະທຳນີ້.
        ຄ່າເລີ່ມຕົ້ນມາຈາກ{ROLE_LABEL_LO[target.role]} — ຊ່ອງທີ່ມີ{' '}
        <span className="inline-block size-1.5 rounded-full bg-brand-orange align-middle" />{' '}
        ຄືຊ່ອງທີ່ຕັ້ງເອງຕ່າງຈາກບົດບາດ. ບໍ່ຕິກ &quot;ເບິ່ງ&quot; ຂອງເມນູແມ່
        ແລ້ວເມນູຍ່ອຍປິດຕາມ.
      </p>

      <ActionForm action={setMenuPermissions} className="mt-3">
        <input type="hidden" name="employee_id" value={employeeId} />

        <div className="o-list-wrap mt-2 overflow-x-auto">
          <table className="o-list w-full min-w-[460px] text-[13px]">
            <thead>
              <tr>
                <th className="o-sticky-col px-3 py-1.5 text-left font-medium">
                  ເມນູ
                </th>
                {MENU_ACTIONS.map((a: MenuAction) => (
                  <th
                    key={a}
                    title={MENU_ACTION_HINT_LO[a]}
                    className="w-[86px] cursor-help px-3 py-1.5 text-center font-medium"
                  >
                    {MENU_ACTION_LABEL_LO[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MENU_PERMS.map((m, index) => (
                <tr key={m.key} className="hover-surface transition">
                  <td className="o-sticky-col px-3 py-1.5">
                    <span className={m.parent ? 'pl-5 text-body' : 'font-medium text-fg'}>
                      {m.parent ? `└ ${m.label}` : m.label}
                    </span>
                    {/* ເສັ້ນທາງໄວ້ອ້າງອີງ — ເຊື່ອງຢູ່ຈໍແຄບໃຫ້ 4 ຖັນພໍດີ */}
                    <span className="ml-1.5 hidden font-mono text-[11px] text-faint xl:inline">
                      {m.key}
                    </span>
                  </td>

                  {MENU_ACTIONS.map((a: MenuAction) => {
                    if (!m.actions.includes(a)) {
                      return (
                        <td key={a} className="px-3 py-1.5 text-center text-faint">
                          –
                        </td>
                      )
                    }

                    const current = override.get(`${m.key}.${a}`)
                    const byRole = roleAllowsMenu(target.role, m.key, a, roleAllows)
                    // ຕິກໄວ້ຕາມສິດທີ່ໃຊ້ຢູ່ຈິງ — ຕັ້ງເອງມາກ່ອນ ບໍ່ດັ່ງນັ້ນຕາມບົດບາດ
                    const on = current ?? byRole

                    return (
                      <td key={a} className="px-3 py-1.5 text-center">
                        <label
                          title={
                            current === undefined
                              ? `ຕາມ${ROLE_LABEL_LO[target.role]} (${byRole ? 'ໄດ້' : 'ບໍ່ໄດ້'})`
                              : `ຕັ້ງເອງ: ${current ? 'ອະນຸຍາດ' : 'ຫ້າມ'}`
                          }
                          className="inline-flex cursor-pointer items-center justify-center"
                        >
                          <input
                            type="checkbox"
                            name={`m${index}_${a}`}
                            defaultChecked={on}
                            className="size-4 cursor-pointer accent-[var(--primary)]"
                          />
                          {current !== undefined && (
                            <span
                              aria-hidden
                              className="ml-1 size-1.5 rounded-full bg-brand-orange"
                            />
                          )}
                        </label>
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
          <span className="text-xs text-muted">ຕັ້ງເອງຢູ່ {override.size} ຂໍ້</span>
        </div>
      </ActionForm>
    </div>
  )
}
