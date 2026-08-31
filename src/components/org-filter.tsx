import type { OrgOption } from '@/lib/assets/queries'

/**
 * ຕົວກັ່ນຕອງໂຄງສ້າງອົງກອນ 3 ລະດັບ: ຝ່າຍ → ພະແນກ → ໜ່ວຍງານ
 * ແຕ່ລະລະດັບແຄບລົງຕາມລະດັບເທິງທີ່ເລືອກ (ຄິດຢູ່ຝັ່ງເຊີບເວີແລ້ວ)
 */
export default function OrgFilter({
  divisions,
  departments,
  units,
  selected,
  countBy = 'people',
}: {
  divisions: OrgOption[]
  departments: OrgOption[]
  units: OrgOption[]
  selected: { division: string; department: string; unit: string }
  countBy?: 'people' | 'items'
}) {
  const levels = [
    { name: 'division', label: 'ຝ່າຍ', all: 'ທຸກຝ່າຍ', options: divisions },
    { name: 'department', label: 'ພະແນກ', all: 'ທຸກພະແນກ', options: departments },
    { name: 'unit', label: 'ໜ່ວຍງານ', all: 'ທຸກໜ່ວຍງານ', options: units },
  ] as const

  return (
    <>
      {levels.map((level) => (
        <label
          key={level.name}
          className="flex flex-col gap-1 text-xs text-muted"
        >
          {level.label}
          <select
            name={level.name}
            defaultValue={selected[level.name]}
            className="input w-48 rounded px-2 py-1 text-[13px]"
          >
            <option value="">{level.all}</option>
            {level.options.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name} ({option[countBy]})
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  )
}
