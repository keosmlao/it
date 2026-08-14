// Usage: node --env-file=.env.local scripts/refresh-cache.mjs
//
// ອັບເດດ cache ປະຫວັດຢືມ–ຄືນ (it.asset_movements_mv).
//
// ເປັນຫຍັງຕ້ອງມີ: cache ຖືກ refresh ສະເພາະຕອນລະບົບນີ້ອອກໃບຢືມ/ໃບຄືນ.
// ແຕ່ຂໍ້ມູນທີ່ມັນອ່ານມາຍັງມີ **ຂໍ້ມູນພະນັກງານ** ແລະ **ໃບຢືມຈາກ ERP** ນຳ
// ຊຶ່ງປ່ຽນຢູ່ນອກລະບົບນີ້. ຖ້າບໍ່ແລ່ນອັນນີ້ຕາມຕາຕະລາງ:
//   · ຄົນລາອອກຈະບໍ່ຂຶ້ນລາຍການທວງຄືນຈົນກວ່າຈະມີໃຜບັນທຶກຢືມ–ຄືນ
//   · ໃບຢືມທີ່ອອກຈາກ ERP ຈະຍັງບໍ່ປາກົດໃນລະບົບນີ້
//
// ຕັ້ງໃນ Windows Task Scheduler ໃຫ້ແລ່ນມື້ລະເທື່ອ (ເຊົ້າກ່ອນເຂົ້າວຽກ):
//   npm run refresh:cache
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const started = Date.now()
try {
  const before = await client.query(
    'select count(*) n from it.asset_movements_mv'
  )
  await client.query('select it.refresh_asset_movements()')
  const after = await client.query(
    `select count(*) n,
            count(*) filter (where not is_returned) open,
            count(*) filter (where not is_returned and hr_state = 'resigned') resigned,
            count(*) filter (where not is_returned and hr_state = 'not_in_hr') no_hr
       from it.v_asset_movements`
  )

  const a = after.rows[0]
  console.log(
    `refresh ສຳເລັດ ${Date.now() - started}ms · ` +
      `${before.rows[0].n} → ${a.n} ແຖວ · ຍັງບໍ່ຄືນ ${a.open}`
  )
  if (Number(a.resigned) > 0 || Number(a.no_hr) > 0) {
    console.log(
      `  ⚠ ຄ້າງຢູ່ກັບຄົນລາອອກ ${a.resigned} · ` +
        `ຄົນທີ່ບໍ່ພົບໃນທະບຽນ HR ${a.no_hr} — ເບິ່ງ npm run audit:employees`
    )
  }
} finally {
  await client.end()
}
