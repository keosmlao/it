// ທົດສອບຊັ້ນສິດລາຍຄົນໃນຖານຂໍ້ມູນ — ຂຽນແລ້ວ rollback ບໍ່ແຕະຂໍ້ມູນຈິງ
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

const countAdmins = async () =>
  Number(
    (
      await client.query(`
        select count(*) as n
          from it.v_portal_users v
          left join it.user_permissions p
            on p.employee_id = v.employee_id and p.permission = 'administer'
         where coalesce(p.allowed, v.role = 'manager')`)
    ).rows[0].n
  )

try {
  await client.query('begin')

  const manager = (
    await client.query(
      `select employee_id from it.v_portal_users where role = 'manager' limit 1`
    )
  ).rows[0]
  const support = (
    await client.query(
      `select employee_id from it.v_portal_users where role <> 'manager' limit 1`
    )
  ).rows[0]
  check('ມີຜູ້ຈັດການ ແລະ ພະນັກງານໃຫ້ທົດສອບ', Boolean(manager && support))

  const baseAdmins = await countAdmins()
  check('ນັບຜູ້ດູແລລະບົບຕັ້ງຕົ້ນໄດ້', baseAdmins > 0, `${baseAdmins} ຄົນ`)

  // ---- ເປີດສິດອະນຸມັດໃຫ້ພະນັກງານທຳມະດາ ----
  await client.query(
    `insert into it.user_permissions
       (employee_id, permission, allowed, updated_by)
     values ($1::int, 'approve', true, $2::int)`,
    [support.employee_id, manager.employee_id]
  )

  // ---- query ດຽວກັບທີ່ session.ts ໃຊ້ ----
  const loaded = (
    await client.query(
      `select (select json_object_agg(p.permission, p.allowed)
                 from it.user_permissions p
                where p.employee_id = $1::int) as permissions`,
      [support.employee_id]
    )
  ).rows[0].permissions
  check(
    'session ດຶງສິດອອກມາເປັນ JSON ຖືກ',
    loaded?.approve === true,
    JSON.stringify(loaded)
  )

  // ---- ຫ້າມ administer ຜູ້ຈັດການທຸກຄົນ → ຕ້ອງເຫຼືອ 0 (ຕົວກວດຕ້ອງຈັບໄດ້) ----
  await client.query(
    `insert into it.user_permissions
       (employee_id, permission, allowed, updated_by)
     select v.employee_id, 'administer', false, $1::int
       from it.v_portal_users v
      where v.role = 'manager'
     on conflict (employee_id, permission)
       do update set allowed = false`,
    [manager.employee_id]
  )
  check('ຕົວກວດຈັບໄດ້ວ່າຈະບໍ່ເຫຼືອຜູ້ດູແລລະບົບ', (await countAdmins()) === 0)

  // ---- ເປີດໃຫ້ຄົນທີ່ບໍ່ແມ່ນຜູ້ຈັດການແທນ → ກັບມາມີ 1 ----
  await client.query(
    `insert into it.user_permissions
       (employee_id, permission, allowed, updated_by)
     values ($1::int, 'administer', true, $2::int)
     on conflict (employee_id, permission) do update set allowed = true`,
    [support.employee_id, manager.employee_id]
  )
  check(
    'ຕັ້ງຜູ້ດູແລລະບົບຈາກຄົນທີ່ບໍ່ແມ່ນຜູ້ຈັດການໄດ້',
    (await countAdmins()) === 1
  )

  // ---- view ຕ້ອງແນບຊື່ ----
  const named = (
    await client.query(
      `select employee_name, updated_by_name from it.v_user_permissions
        where employee_id = $1::int limit 1`,
      [support.employee_id]
    )
  ).rows[0]
  check(
    'view ແນບຊື່ຜູ້ໃຊ້ ແລະ ຜູ້ຕັ້ງ',
    Boolean(named?.employee_name && named?.updated_by_name)
  )
  // ---- ສິດລາຍເມນູ (ເບິ່ງ/ເພີ່ມ/ແກ້ໄຂ/ລົບ) ----
  // key ຮູບແບບ `<href ເມນູ>.<ການກະທຳ>` ໃຊ້ຕາຕະລາງດຽວກັນ ຈຶ່ງຕ້ອງບໍ່ຕີກັນ
  // ກັບ 9 ຂໍ້ທົ່ວໄປ — ໜ້າຕັ້ງຄ່າແຕ່ລະໜ້າລຶບສະເພາະຊຸດຂອງຕົນເອງ
  await client.query(
    `insert into it.user_permissions (employee_id, permission, allowed, updated_by)
     values ($1::int, '/subscriptions/new.create', true, $2::int),
            ($1::int, '/assets.view', false, $2::int)`,
    [support.employee_id, manager.employee_id]
  )

  const mods = (
    await client.query(
      `select permission, allowed from it.user_permissions
        where employee_id = $1::int and permission like '/%'
        order by permission`,
      [support.employee_id]
    )
  ).rows
  check('ເກັບສິດລາຍເມນູໄດ້', mods.length === 2, JSON.stringify(mods))

  // ບັນທຶກ 9 ຂໍ້ທົ່ວໄປ ຕ້ອງບໍ່ລ້າງສິດລາຍເມນູຖິ້ມ
  await client.query(
    `delete from it.user_permissions
      where employee_id = $1::int and permission not like '/%'`,
    [support.employee_id]
  )
  const stillThere = Number(
    (
      await client.query(
        `select count(*) as n from it.user_permissions
          where employee_id = $1::int and permission like '/%'`,
        [support.employee_id]
      )
    ).rows[0].n
  )
  check('ບັນທຶກສິດທົ່ວໄປແລ້ວ ສິດລາຍເມນູຍັງຢູ່', stillThere === 2, `${stillThere} ຂໍ້`)

  // ແລະ ກັບກັນ
  await client.query(
    `delete from it.user_permissions
      where employee_id = $1::int and permission like '/%'`,
    [support.employee_id]
  )
  const globals = Number(
    (
      await client.query(
        `select count(*) as n from it.user_permissions
          where employee_id = $1::int and permission not like '/%'`,
        [support.employee_id]
      )
    ).rows[0].n
  )
  check('ບັນທຶກສິດລາຍເມນູແລ້ວ ບໍ່ແຕະສິດທົ່ວໄປ', globals === 0, `${globals} ຂໍ້`)
} finally {
  await client.query('rollback')
  await client.end()
}

console.log(failed === 0 ? '\nຜ່ານທັງໝົດ' : `\nຕົກ ${failed} ຂໍ້`)
process.exit(failed === 0 ? 0 : 1)
