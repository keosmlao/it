# ນຳລະບົບຂຶ້ນໃຊ້ຈິງ

ລະບົບນີ້ເປັນ Next.js ທີ່ແລ່ນເປັນ server ຢູ່ເຄື່ອງພາຍໃນບໍລິສັດ
(ບໍ່ຕ້ອງໃຊ້ບໍລິການພາຍນອກ ເພາະຖານຂໍ້ມູນຢູ່ພາຍໃນ).

## ຄວາມຕ້ອງການ

| ຢ່າງ | ລຸ້ນ |
| --- | --- |
| Node.js | 20 ຂຶ້ນໄປ (ທົດສອບດ້ວຍ 22) |
| PostgreSQL | 11 ຂຶ້ນໄປ (ຂອງບໍລິສັດແມ່ນ 11.22) |
| ໜ່ວຍຄວາມຈຳ | 2 GB ພຽງພໍ |

## ຂັ້ນຕອນຄັ້ງທຳອິດ

```bash
# 1. ເອົາໂຄ້ດລົງເຄື່ອງ server
git clone <repo> C:\odg-it
cd C:\odg-it

# 2. ຕັ້ງຄ່າ
copy .env.example .env.local
notepad .env.local          # ໃສ່ DATABASE_URL ແລະ ຄ່າອື່ນ

# 3. ຕິດຕັ້ງ, ອັບເດດຖານຂໍ້ມູນ, ແລະ build
npm run deploy

# 4. ກວດຄວາມພ້ອມ
npm run healthcheck

# 5. ເລີ່ມ
npm start
```

ຄ່າເລີ່ມຕົ້ນຟັງຢູ່ port 3000 — ປ່ຽນດ້ວຍ `set PORT=8080 && npm start`

## ຄ່າໃນ .env.local

| ຊື່ | ບັງຄັບ | ຄຳອະທິບາຍ |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@db.odienmall.com:5432/odg` |
| `DATABASE_SCHEMA` | ✅ | `it` |
| `APP_BASE_URL` | ແນະນຳ | ທີ່ຢູ່ຂອງລະບົບ ໃສ່ໃນລິ້ງທ້າຍຂໍ້ຄວາມ LINE |
| `LINE_CHANNEL_ACCESS_TOKEN` |  | ບໍ່ໃສ່ = ຂໍ້ຄວາມຄ້າງຢູ່ຄິວ ບໍ່ຫາຍ |
| `NOTIFY_DRAIN_SECRET` |  | ລະຫັດໃຫ້ຕົວຈັດຕາຕະລາງເອີ້ນສົ່ງ |
| `SMTP_HOST` |  | ເຊີເວີສົ່ງອີເມວ — ບໍ່ຕັ້ງ = ສົ່ງແຕ່ LINE |
| `SMTP_PORT` | 465 | 465 = TLS ຕັ້ງແຕ່ຕົ້ນ · 587 = STARTTLS |
| `SMTP_USER` |  | ຊື່ຜູ້ໃຊ້ SMTP (ຖ້າຕ້ອງການ) |
| `SMTP_PASS` |  | ລະຫັດຜ່ານ SMTP |
| `SMTP_FROM` |  | ທີ່ຢູ່ຜູ້ສົ່ງ ເຊັ່ນ `it@odien.net` |

> `.env.local` ມີລະຫັດຜ່ານ — `.gitignore` ກັນໄວ້ແລ້ວ **ຢ່າ commit**

## ໃຫ້ແລ່ນຕະຫຼອດ (Windows)

ໃຊ້ PM2 ຫຼື NSSM ໃຫ້ເປັນ service:

```bash
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start npm --name odg-it -- start
pm2 save
```

ເບິ່ງ log: `pm2 logs odg-it` · ຣີສະຕາດ: `pm2 restart odg-it`

## ສົ່ງຂໍ້ຄວາມ LINE ຕາມເວລາ

ຕັ້ງ Task Scheduler ໃຫ້ເອີ້ນທຸກ 5 ນາທີ:

```powershell
curl -X POST -H "x-notify-secret: <NOTIFY_DRAIN_SECRET>" http://localhost:3000/api/notify/drain
```

ຖ້າບໍ່ຕັ້ງ ຜູ້ຈັດການກົດສົ່ງເອງໄດ້ຈາກໜ້າ **ຕັ້ງຄ່າລະບົບ**

> ຮອບນີ້ຍັງອັບເດດ **cache ປະຫວັດຢືມ–ຄືນ** ນຳ (`it.asset_movements_mv`)
> ຈຶ່ງຄວນຕັ້ງໄວ້ ເຖິງແມ່ນຍັງບໍ່ໄດ້ໃຊ້ LINE — ບໍ່ດັ່ງນັ້ນໃບຢືມທີ່ອອກຈາກ ERP
> ໂດຍກົງຈະບໍ່ປະກົດຢູ່ລະບົບນີ້ (ໃບທີ່ອອກຈາກລະບົບນີ້ເຫັນທັນທີຢູ່ແລ້ວ)

## ວຽກເຕືອນປະຈຳວັນ

ຕັ້ງ Task Scheduler ອີກອັນໃຫ້ແລ່ນມື້ລະເທື່ອ (ແນະນຳ 08:00):

```powershell
curl -X POST -H "x-notify-secret: <NOTIFY_DRAIN_SECRET>" http://localhost:3000/api/reminders/run
```

ອັນດຽວກວດໃຫ້ 2 ເລື່ອງ:

| ເລື່ອງ | ເຕືອນເມື່ອໃດ | ຫາໃຜ |
| --- | --- | --- |
| ຄ່າເຊົ່າບໍລິການ (`it.subscriptions`) | ກ່ອນ 30 / 7 / 1 ມື້ ແລະ ມື້ຮອດກຳນົດ | ຜູ້ຮັບຜິດຊອບ · ເລີຍກຳນົດແລ້ວແຈ້ງຜູ້ຈັດການນຳ |
| ບຳລຸງຮັກສາຕາມແຜນ (`it.maintenance_plans`) | ກ່ອນ 7 / 1 ມື້ ແລະ ມື້ຮອດກຳນົດ | ຜູ້ຮັບຜິດຊອບ · ເລີຍກຳນົດແລ້ວແຈ້ງຫົວໜ້ານຳ |

ພ້ອມກັນນັ້ນຍັງປິດສັນຍາທີ່ໝົດອາຍຸ ແລະ ບໍ່ຕໍ່ອັດຕະໂນມັດໃຫ້ເປັນ `expired`.
ຖ້າວຽກຂາດໄປຫຼາຍມື້ ຈະບໍ່ຍິງທຸກຂັ້ນພ້ອມກັນ — ສົ່ງສະເພາະຂັ້ນທີ່ດ່ວນທີ່ສຸດ

> ເສັ້ນທາງເກົ່າ `/api/subscriptions/remind` ຍັງໃຊ້ໄດ້ ຖ້າຢາກເອີ້ນສະເພາະຄ່າເຊົ່າ

> ຂໍ້ຄວາມພຽງແຕ່ເຂົ້າຄິວ — ຕົວສົ່ງແທ້ແມ່ນ `/api/notify/drain`
> ຈຶ່ງຕ້ອງຕັ້ງອັນນັ້ນໄວ້ນຳ ບໍ່ດັ່ງນັ້ນຂໍ້ຄວາມຈະຄ້າງຢູ່ຄິວ.
> ຜູ້ຈັດການເອີ້ນເອງກໍໄດ້ (login ແລ້ວ POST ໂດຍບໍ່ຕ້ອງມີ secret)

## ອັບເດດລຸ້ນໃໝ່

```bash
git pull
npm run deploy
pm2 restart odg-it
npm run healthcheck
```

`npm run db:migrate` ຂ້າມໄຟລ໌ທີ່ແລ່ນແລ້ວ ຈຶ່ງແລ່ນຊ້ຳໄດ້ຢ່າງປອດໄພ

## ໄຟລ໌ແນບ

ຮູບທີ່ຜູ້ໃຊ້ແນບເກັບຢູ່ໂຟນເດີ `uploads/` (ຢູ່ນອກ `public/` ຈຶ່ງເປີດກົງບໍ່ໄດ້
ຕ້ອງຜ່ານ `/api/attachments/[id]` ທີ່ກວດສິດກ່ອນ).
**ໂຟນເດີນີ້ບໍ່ຢູ່ໃນ git — ຕ້ອງສຳຮອງແຍກຕ່າງຫາກ**

## ຄຳສັ່ງກວດສອບ

| ຄຳສັ່ງ | ກວດຫຍັງ |
| --- | --- |
| `npm run healthcheck` | ຖານຂໍ້ມູນ, migration, ຄ່າຕັ້ງ, ໜ້າເວັບ |
| `npm run db:check-sql` | PREPARE ທຸກຄຳສັ່ງ SQL ໃນໂຄ້ດ (ກັນບັກ PG11) |
| `npm test` | ກົດການເຂົ້າເຖິງ (RBAC) |
| `npm run db:smoke` | ໂມດູນຫຼັກທັງໝົດ (rollback ທ້າຍສຸດ) |
| `npm run db:smoke-pr` | ໃບສະເໜີຊື້ (ຢູ່ຕາຕະລາງ ERP) + ຂັ້ນຕອນອະນຸມັດ |
| `npm run smoke:pr-sml` | ຄົ້ນຫາສິນຄ້າ + ຄິດຍອດແບບ SML (ຫຼຸດ/ພາສີ) |
| `npm run db:smoke-plans` | ແຜນວຽກປະຈຳວັນ |
| `npm run db:smoke-return` | ຄືນເຄື່ອງຂອງໃບຢືມ ERP |
| `npm run db:smoke-transfer` | ໂອນເຄື່ອງໃຫ້ຄົນອື່ນ (ບໍ່ຄືນເຂົ້າສາງ) |
| `npm run db:smoke-condition` | ເຄື່ອງເພ / ຕັດຈຳໜ່າຍ / ອຸປະກອນສ່ວນກາງ |
| `npm run smoke:requester` | ຂອບເຂດສິດຂອງຜູ້ແຈ້ງບັນຫາ |
| `npm run smoke:export` | ດຶງຂໍ້ມູນອອກທຸກຮູບແບບ |
| `npm run smoke:pdf` | ຕົວອັກສອນລາວ/ອັງກິດໃນ PDF ຄົບ |
| `npm run smoke:notify` | ຄິວແຈ້ງເຕືອນ |
| `npm run smoke:subscriptions` | ຄ່າເຊົ່າບໍລິການ (ຄິດຄ່າ, ກຳນົດຈ່າຍ, ງວດ, ການເຕືອນ) |
| `npm run smoke:itops` | ຜູ້ຂາຍ · ບຳລຸງຮັກສາ · ເຫດຂັດຂ້ອງ · ບັນຊີຜູ້ໃຊ້ · ຂອງສິ້ນເປືອງ · ເຄືອຂ່າຍ · ງົບປະມານ · CSAT |
| `npm run smoke:platform` | ເອກະສານແນບ · ແຜນປ່ຽນເຄື່ອງ · ອີເມວແຈ້ງເຕືອນ · ຄົ້ນຫາ · ກວດຄວາມປອດໄພ |
| `npm run smoke:nav` | sidebar ເນັ້ນແຖວດຽວ ແລະ ບໍ່ມີລິ້ງຊ້ຳ |
| `npm run smoke:loading` | ທຸກໜ້າມີໂຄງລໍໂຫຼດ (ບໍ່ຕ້ອງມີ server) |
| `npm run audit:loans` | ກວດຄວາມຜິດປົກກະຕິຂອງໃບຢືມ–ຄືນ (ອ່ານຢ່າງດຽວ) |

ຄຳສັ່ງທີ່ຂຶ້ນຕົ້ນດ້ວຍ `smoke:` ຕ້ອງມີ server ແລ່ນຢູ່ກ່ອນ
(ຄ່າເລີ່ມຕົ້ນ `http://localhost:3100` — ໃສ່ທີ່ຢູ່ອື່ນເປັນ argument ໄດ້)

## ຄວາມປອດໄພທີ່ຄວນຮູ້

- ລະບົບນີ້ **ອ່ານ** ຂໍ້ມູນ ERP (`public.*`) ຢ່າງດຽວ — ຂໍ້ມູນຂອງພະແນກ IT
  ຢູ່ schema `it` ທັງໝົດ. ມີ 2 ຂໍ້ຍົກເວັ້ນທີ່ຜູ້ໃຊ້ສັ່ງເອງ:
  1. **ໃບສະເໜີຊື້** ຂຽນລົງ `public.odg_pm_pr` / `odg_pm_pr_line`
     (ຕາຕະລາງຂອງໂມດູນຈັດຊື້ ເຊິ່ງຍັງວ່າງຢູ່) ສ່ວນຊ່ອງທີ່ ERP ບໍ່ມີ
     ເກັບເສີມຢູ່ `it.pr_extra`
  2. `scripts/fix-erp-asset-type.mjs` ແກ້ `as_asset.as_type` ທີ່ຜິດ —
     ຕ້ອງແລ່ນດ້ວຍມື ແລະ ບັນທຶກຄ່າເກົ່າໄວ້ `it.erp_data_fixes` ຍ້ອນຄືນໄດ້
- ຄໍລຳ `odg_employee.password` ເປັນ **ອ່ານຢ່າງດຽວ** — ແອັບອື່ນໃຊ້ຮ່ວມກັນ
  ຫ້າມຂຽນທັບ
- session ເກັບຢູ່ `it.sessions` ອາຍຸ 8 ຊົ່ວໂມງ, cookie httpOnly
- ພະນັກງານພະແນກອື່ນ (requester) ເຂົ້າໄດ້ສະເພາະ `/my/*`
  ດ່ານກັນຢູ່ `src/app/(app)/layout.tsx` ບ່ອນດຽວ
