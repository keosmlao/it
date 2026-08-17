# ລະບົບບໍລິຫານພະແນກ IT (IT Department Management System)

## ຄວາມຄືບໜ້າ — ຄົບທຸກໂມດູນແລ້ວ

| ໂມດູນ | ເສັ້ນທາງ | ສະຖານະ |
|---|---|---|
| Auth (login, session, RBAC) | `/login` | ✅ |
| Layout + ເມນູຕາມ role + theme | — | ✅ |
| Dashboard | `/` | ✅ |
| Ticket + SLA | `/tickets` | ✅ |
| ໂປຣເຈັກ + Kanban | `/projects` | ✅ |
| Task ຂອງຂ້ອຍ | `/tasks` | ✅ |
| ບັນທຶກຊົ່ວໂມງ | `/worklogs` | ✅ |
| ຄຳຮ້ອງ + ອະນຸມັດ 2 ຂັ້ນ | `/requests` | ✅ |
| ອຸປະກອນ + ປະຫວັດ | `/assets` | ✅ |
| ຄ່າເຊົ່າບໍລິການ (ອິນເຕີເນັດ/cloud/mail/AI) | `/subscriptions` | ✅ |
| ບຳລຸງຮັກສາຕາມແຜນ | `/maintenance` | ✅ |
| ເຫດຂັດຂ້ອງລະບົບ (downtime) | `/incidents` | ✅ |
| ບັນຊີຜູ້ໃຊ້ | `/accounts` | ✅ |
| ອຸປະກອນສິ້ນເປືອງ | `/consumables` | ✅ |
| ເຄືອຂ່າຍ & IP | `/network` | ✅ |
| ທະບຽນຜູ້ຂາຍ | `/vendors` | ✅ |
| ງົບປະມານ ທຽບ ໃຊ້ຈິງ | `/budget` | ✅ (ຫົວໜ້າ/ຜູ້ຈັດການ) |
| ຄັງຄວາມຮູ້ | `/kb` | ✅ |
| ລາຍງານ KPI | `/reports` | ✅ (ຫົວໜ້າ/ຜູ້ຈັດການ) |
| ການແຈ້ງເຕືອນ | `/notifications` | ✅ |
| ຕັ້ງຄ່າລະບົບ + audit log | `/admin` | ✅ (ຜູ້ຈັດການ) |

ຄຳສັ່ງທີ່ໃຊ້ເລື້ອຍ:
```bash
npm run dev           # ເປີດ dev server
npm run db:migrate    # ຮັນ migration ໃໝ່
npm run db:check      # ກວດການເຊື່ອມຕໍ່ DB ແລະ ລາຍຊື່ຕາຕະລາງ
npm run db:check-sql  # PREPARE ທຸກຄຳສັ່ງ SQL ໃນ src/ ກັບ DB ຈິງ
npm run db:smoke      # ທົດສອບທຸກໂມດູນ (rollback ອັດຕະໂນມັດ)
npm run db:smoke-files # ທົດສອບການອັບໂຫລດ/ອ່ານຮູບແນບ
```

## ທະບຽນຊັບສິນ — ດຶງຈາກ ERP (ອ່ານຢ່າງດຽວ)

ບໍລິສັດມີທະບຽນຊັບສິນຢູ່ແລ້ວ ຈຶ່ງ**ບໍ່ປ້ອນຊ້ຳ** — ໂມດູນອຸປະກອນອ່ານຈາກ view
ໃນ [007_erp_assets.sql](../db/migrations/007_erp_assets.sql):

| View | ມາຈາກ | ຈຳນວນ |
|---|---|---|
| `it.v_it_assets` | `as_asset` (as_type `200` = ອຸປະກອນໄອທີ) + `as_asset_detail` + `as_asset_type` + `as_asset_location` + `odg_it_category` + `erp_department_list` | 369 ເຄື່ອງ |
| `it.v_asset_holders` | `report_asset_trans_detail` ທີ່ຍັງບໍ່ມີ `return_doc_no` | ຜູ້ຖືຄອງປັດຈຸບັນ |
| `it.v_asset_movements` | `report_asset_trans_detail` | 346 ລາຍການຢືມ–ຄືນ |

- **ຢືມ** = `asset_trans.doc_type = 10` (ເລກ `BRIT…`) · **ຄືນ** = `doc_type = 20` (`RTIT…`)
- "ຢູ່ໃນສາງ" ຄິດຈາກການບໍ່ມີໃບຢືມທີ່ຄ້າງ ບໍ່ແມ່ນຄໍລຳສະຖານະ
- ວັນທີບາງແຖວໃນຂໍ້ມູນເກົ່າເສຍຮູບແບບ (ປີ 020236) → `safeDate()` ໃນ
  [assets/model.ts](../src/lib/assets/model.ts) ກັນບໍ່ໃຫ້ສະແດງມົ້ວ

> ຕາຕະລາງ `it.assets` ຂອງເກົ່າ (ຫວ່າງເປົ່າ) ບໍ່ໄດ້ໃຊ້ແລ້ວ — ໜ້າ "ເພີ່ມອຸປະກອນ"
> ຖືກເອົາອອກ ເພາະການເພີ່ມຊັບສິນ ແລະ ອອກໃບຢືມ–ຄືນ ເປັນໜ້າທີ່ຂອງລະບົບ ERP.

## ຄ່າເຊົ່າບໍລິການ — ທະບຽນຂອງລະບົບນີ້ເອງ

ບໍລິການທີ່ຈ່າຍເປັນງວດ (ອິນເຕີເນັດ, cloud, mail server, AI, ໂດເມນ, SSL,
ໃບອະນຸຍາດ) **ບໍ່ແມ່ນຊັບສິນ** — ບໍ່ມີ serial, ບໍ່ມີຜູ້ຖືຄອງ, ຢືມ–ຄືນບໍ່ໄດ້
ແຕ່ຂາດຕໍ່ອາຍຸແລ້ວບໍລິການລົ້ມ. ຈຶ່ງແຍກເປັນໂມດູນຂອງມັນເອງໃນ
[040_subscriptions.sql](../db/migrations/040_subscriptions.sql):

| ຕາຕະລາງ / View | ໜ້າທີ່ |
|---|---|
| `it.subscriptions` | ສັນຍາ (ຜູ້ຂາຍ, ແພັກເກັດ, ຮອບຈ່າຍ, ຜູ້ຮັບຜິດຊອບ, ກຳນົດຈ່າຍຄັ້ງຕໍ່ໄປ) — ລະຫັດ `SUB-ປີ-ລຳດັບ` |
| `it.subscription_periods` | ແຕ່ລະງວດທີ່ຈ່າຍຈິງ + ເລກໃບບິນ (ງວດເລີ່ມວັນດຽວກັນຊໍ້າບໍ່ໄດ້) |
| `it.subscription_reminders` | ບັນທຶກວ່າເຕືອນຂັ້ນໃດໄປແລ້ວ — ກັນສົ່ງ LINE ຊໍ້າທຸກມື້ |
| `it.v_subscriptions` | ຄິດ `monthly_amount` / `yearly_amount` / `days_to_due` / `due_status` ໃຫ້ບ່ອນດຽວ |

ຂໍ້ຕົກລົງທີ່ສຳຄັນ:

- **2 ຊັ້ນ (ສັນຍາ / ງວດ)** — ຖ້າເກັບແຖວດຽວ ລາຄາໃໝ່ຈະທັບຂອງເກົ່າ
  ແລ້ວສະຫຼຸບຄ່າໃຊ້ຈ່າຍຍ້ອນຫຼັງບໍ່ໄດ້
- **ບໍ່ແປງສະກຸນເງິນ** — ເກັບ `amount` + `currency` ຕາມທີ່ຈ່າຍຈິງ ແລະ ລາຍງານ
  ແຍກຕາມສະກຸນ ເພາະອັດຕາແລກປ່ຽນປ່ຽນທຸກມື້ ຕົວເລກທີ່ລວມໄວ້ຈະຜິດທັນທີ
- **ບໍ່ເກັບລະຫັດຜ່ານ / API key** — ເກັບພຽງ "ບັນຊີຊື່ຫຍັງ ຢູ່ບ່ອນໃດ"
  ເພາະຕາຕະລາງນີ້ພະນັກງານ IT ອ່ານໄດ້ທຸກຄົນ ແລະ ດຶງອອກ Excel ໄດ້
- **ຍົກເລີກແທນການລຶບ** — ງວດທີ່ຈ່າຍໄປແລ້ວຜູກກັບສັນຍາຢູ່ ລຶບແລ້ວ
  ຄ່າໃຊ້ຈ່າຍປີກ່ອນຈະຫາຍໄປຈາກລາຍງານ
- **ສິດ `manageSubscriptions`** — ຕັ້ງຕົ້ນໃຫ້ຜູ້ຈັດການ ແລະ ຫົວໜ້າໜ່ວຍງານ
  (ຄົນອື່ນເຫັນລາຍການໄດ້ ແຕ່ແກ້ບໍ່ໄດ້) ເປີດໃຫ້ລາຍຄົນໄດ້ຢູ່ໜ້າຕັ້ງຄ່າ

ການແຈ້ງເຕືອນ: `POST /api/subscriptions/remind` (ຕັ້ງ Task Scheduler ມື້ລະເທື່ອ —
ເບິ່ງ [DEPLOY.md](../DEPLOY.md)) ເຕືອນລ່ວງໜ້າ **30 / 7 / 1 ມື້** ແລະ ມື້ຮອດກຳນົດ
ຫາຜູ້ຮັບຜິດຊອບ ພ້ອມແຈ້ງຜູ້ຈັດການອີກເທື່ອເມື່ອເລີຍກຳນົດ. ຖ້າວຽກຂາດໄປຫຼາຍມື້
ຈະບໍ່ຍິງທຸກຂັ້ນພ້ອມກັນ — ສົ່ງສະເພາະຂັ້ນທີ່ດ່ວນທີ່ສຸດ

## ໂຄງລ່າງ IT — 7 ໂມດູນທີ່ຕໍ່ຈາກຄ່າເຊົ່າ

ສ້າງໃນ migration [041](../db/migrations/041_vendors.sql)–[048](../db/migrations/048_ticket_ratings.sql)
ໂດຍໃຊ້ຮູບແບບດຽວກັນໝົດ: ຕາຕະລາງດິບ + view ທີ່ຄິດຄ່າໃຫ້ + ໜ້າຈໍທີ່ອ່ານຈາກ view

| ໂມດູນ | ຕາຕະລາງຫຼັກ | ສິ່ງທີ່ view ຄິດໃຫ້ |
|---|---|---|
| ຜູ້ຂາຍ | `vendors` | ຍອດຈ່າຍຕໍ່ປີຕໍ່ເຈົ້າ, ຈຳນວນສັນຍາ/ໃບສ້ອມ |
| ບຳລຸງຮັກສາ | `maintenance_plans` · `_logs` · `_reminders` | `days_to_due`, `due_status`, ຈຳນວນຄັ້ງທີ່ພົບບັນຫາ |
| ເຫດຂັດຂ້ອງ | `incidents` | ນາທີທີ່ລົ້ມ (ຍັງບໍ່ຈົບ = ນັບຮອດດຽວນີ້) |
| ບັນຊີຜູ້ໃຊ້ | `account_systems` · `system_accounts` | `should_close`, seat ທີ່ຍັງເຫຼືອ |
| ຮັບເຂົ້າ/ອອກ | `employee_checklists` · `checklist_items` · `_templates` | ຄວາມຄືບໜ້າ %, ເກີນກຳນົດ |
| ຂອງສິ້ນເປືອງ | `consumables` · `consumable_moves` | ຍອດຄົງເຫຼືອ, `stock_state`, ມູນຄ່າໃນສາງ |
| ເຄືອຂ່າຍ | `network_segments` · `ip_assignments` · `switch_ports` | ຈຳນວນ IP ທີ່ໃຊ້ຢູ່ |
| ງົບປະມານ | `budget_lines` · `budget_spends` | ຍອດໃຊ້ຈິງ, ຍັງເຫຼືອ, %, `budget_state` |
| CSAT | `ticket_ratings` | ຄະແນນສະເລ່ຍຕໍ່ຄົນ / ຕໍ່ຊ່ວງເວລາ |

ຂໍ້ຕົກລົງທີ່ສຳຄັນ:

- **ຍອດຄົງເຫຼືອຂອງສິ້ນເປືອງບໍ່ເກັບເປັນຄໍລຳ** — ບວກຈາກການເຄື່ອນໄຫວ (ledger).
  ເກັບເປັນຄໍລຳແລ້ວມັນຈະຄາດເຄື່ອນທັນທີທີ່ມີການແກ້ຍ້ອນຫຼັງ ແລະ ຫາສາເຫດບໍ່ໄດ້
- **"ຄວນປິດບັນຊີ" ຄິດຈາກ HR ໂດຍກົງ** (`employment_status`) ບໍ່ໄດ້ລໍໃຫ້ໃຜມາໝາຍ —
  ຫຼັກການດຽວກັບ `v_recovery_targets` ຂອງອຸປະກອນ
- **ກຳນົດບຳລຸງຮັກສາຄັ້ງຕໍ່ໄປນັບຈາກ "ມື້ທີ່ເຮັດແທ້"** ບໍ່ແມ່ນກຳນົດເກົ່າ —
  ບໍ່ດັ່ງນັ້ນວຽກທີ່ຊັກຊ້າຈະຄ້າງເປັນ "ເລີຍກຳນົດ" ຢູ່ ທັງທີ່ຫາກໍເຮັດແລ້ວ
- **ຍອດໃຊ້ຈິງຂອງງົບປະມານອ່ານຈາກຂໍ້ມູນທີ່ມີຢູ່ແລ້ວ** (`source`) —
  ໃບສະເໜີຊື້, ງວດຄ່າເຊົ່າທີ່ຈ່າຍແລ້ວ, ໃບສ້ອມ, ຂອງທີ່ຮັບເຂົ້າ — ຈຶ່ງບໍ່ຕ້ອງປ້ອນຊໍ້າ
- **IP ໃຊ້ຊະນິດ `inet`** ຈຶ່ງຮຽງລຳດັບຖືກ (varchar ຈະຮຽງ .2 ໄວ້ຫຼັງ .10)
  ແລະ ມີ unique index ກັນ IP ຊໍ້າ ເຊິ່ງເປັນສາເຫດອັນດັບໜຶ່ງຂອງ "ເນັດຫຼຸດເປັນບາງເຄື່ອງ"
- **ສິດ `manageAccounts`** ຄຸມບັນຊີ ແລະ ຂັ້ນຕອນເຂົ້າ/ອອກ (ຕັ້ງຕົ້ນ: ຜູ້ຈັດການ + ຫົວໜ້າ)
  ສ່ວນບຳລຸງຮັກສາ, ເຫດຂັດຂ້ອງ, ຂອງສິ້ນເປືອງ, ເຄືອຂ່າຍ ໃຊ້ `manageAssets` ທີ່ມີຢູ່ແລ້ວ
  ແລະ ຜູ້ຂາຍ/ງົບປະມານ ໃຊ້ `manageSubscriptions`

ທົດສອບທັງໝົດດ້ວຍ `npm run smoke:itops` (ຂຽນຈິງແລ້ວ rollback)

## ສ່ວນທີ່ໃຊ້ຮ່ວມກັນທົ່ວລະບົບ

ສ້າງໃນ migration [049](../db/migrations/049_attachments_entities.sql)–[051](../db/migrations/051_notify_email.sql)
ພ້ອມສາມສ່ວນທີ່ບໍ່ຕ້ອງມີຕາຕະລາງໃໝ່

| ສ່ວນ | ເສັ້ນທາງ | ຫຼັກການ |
|---|---|---|
| ເອກະສານແນບທົ່ວລະບົບ | ທຸກໜ້າລາຍລະອຽດ | ຕາຕະລາງ `it.attachments` ອັນເກົ່າ + `(entity_type, entity_id)` |
| ແຜນປ່ຽນເຄື່ອງ | `/assets/replacement` | view ລ້ວນໆ — ບໍ່ມີຂໍ້ມູນໃຫ້ປ້ອນເພີ່ມ |
| ອີເມວແຈ້ງເຕືອນ | `/admin/emails` | ຊ່ອງທາງທີ 2 ຄູ່ກັບ LINE |
| ຄົ້ນຫາຂ້າມໂມດູນ | `/search` | ຊ່ອງຄົ້ນຫາເທິງຫົວ ຫາໄດ້ 10 ໂມດູນ |
| ກວດຄວາມປອດໄພ | `/admin/security` | **ອ່ານຢ່າງດຽວ** |

ຂໍ້ຕົກລົງທີ່ສຳຄັນ:

- **ໄຟລ໌ແນບໃຊ້ຕາຕະລາງດຽວກັບຮູບ ticket** — ບໍ່ສ້າງລະບົບໄຟລ໌ທີ 2 ໃຫ້ດູແລ.
  ແຖວເກົ່າຖືກຍ້າຍເປັນ `entity_type='ticket'` ແລະ `ticket_id` ຍັງຢູ່ຄືເກົ່າ
  ຈຶ່ງຂອບເຂດການເບິ່ງເຫັນຂອງ ticket ບໍ່ປ່ຽນເລີຍ. ເອກະສານຂອງໂມດູນອື່ນ
  ພະນັກງານ IT ເຫັນໄດ້ໝົດ ແຕ່ແນບ/ລຶບໄດ້ສະເພາະຄົນທີ່ມີສິດແກ້ໂມດູນນັ້ນ
- **ຮັບ PDF ແລະ ຮູບເທົ່ານັ້ນ** — ບໍ່ຮັບ Word/Excel ເພາະພາ macro ໄດ້
- **ແຜນປ່ຽນເຄື່ອງບໍ່ເກັບຂໍ້ມູນໃໝ່** — ຄິດຈາກອາຍຸ, ປະກັນ, ຄ່າສ້ອມ, ສະພາບ
  ທີ່ມີຢູ່ແລ້ວ. ລາຄາປະມານໃຊ້ "ລາຄາຊື້ເດີມ" ຈຶ່ງ**ຕໍ່າກວ່າຄວາມຈິງ** ຖ້າ ERP
  ບໍ່ໄດ້ບັນທຶກລາຄາ — ໜ້າຈໍບອກຈຳນວນເຄື່ອງທີ່ບໍ່ມີລາຄາໄວ້ໃຫ້ເຫັນ
- **ອີເມວເກັບໃນ `it.employee_emails`** ບໍ່ໄປເພີ່ມຄໍລຳໃນ `public.odg_employee`
  ທີ່ແອັບອື່ນໃຊ້ຮ່ວມ. ຄິວສົ່ງທັງ 2 ຊ່ອງທາງ — ຕັ້ງແຕ່ LINE ຂໍ້ຄວາມອີເມວຈະຄ້າງລໍ
  (ບໍ່ນັບເປັນລົ້ມເຫຼວ) ຈົນກວ່າຈະຕັ້ງ SMTP

### ⚠️ ລະຫັດຜ່ານ — ຍັງບໍ່ໄດ້ແກ້ ແລະ ບໍ່ຄວນແກ້ຝ່າຍດຽວ

ໜ້າ [/admin/security](../src/app/(app)/admin/security/page.tsx) ພຽງແຕ່**ລາຍງານ**
ວ່າສະຖານະດຽວນີ້ເປັນແນວໃດ — ບໍ່ໄດ້ຂຽນລົງ `public.odg_employee` ເລີຍ.
ຄໍລຳ `password` ນັ້ນແອັບອື່ນໃຊ້ຮ່ວມ ປ່ຽນ hash ຝ່າຍດຽວແລ້ວລະບົບອື່ນອາດ login
ບໍ່ໄດ້ — ຕ້ອງວາງແຜນຮ່ວມກັບເຈົ້າຂອງລະບົບ HR ກ່ອນ.
ໜ້ານີ້ໃຫ້ຕົວເລກໄປລົມ ແລະ ບອກລຳດັບທີ່ຄວນເລີ່ມ (ພະນັກງານ IT ກ່ອນ)

## ຮູບແນບ (ຮູບບັນຫາ ແລະ ຮູບຫຼັກຖານ)

| ຫົວຂໍ້ | ລາຍລະອຽດ |
|---|---|
| ບ່ອນເກັບໄຟລ໌ | ໂຟນເດີ `uploads/tickets/<ticket_id>/` (ຕັ້ງຄ່າດ້ວຍ `UPLOAD_DIR`) — **ຢູ່ນອກ `public/`** ຈຶ່ງເປີດກົງໆຈາກ browser ບໍ່ໄດ້ |
| ຂໍ້ມູນໃນ DB | `it.attachments` ເກັບພຽງ metadata (ຊື່, ຊະນິດ, ຂະໜາດ, ຜູ້ອັບໂຫລດ) ບໍ່ໄດ້ເກັບຕົວໄຟລ໌ ເພື່ອບໍ່ໃຫ້ DB ທີ່ໃຊ້ຮ່ວມກັບແອັບອື່ນໃຫຍ່ຂຶ້ນ |
| ການເສີບຮູບ | `/api/attachments/[id]` — ກວດ session ແລະ ຂອບເຂດການເບິ່ງເຫັນ ticket ກ່ອນສົ່ງທຸກຄັ້ງ |
| ຂໍ້ຈຳກັດ | ຮູບເທົ່ານັ້ນ (png/jpeg/webp/gif/heic) · 5 ຮູບຕໍ່ຄັ້ງ · 8MB ຕໍ່ຮູບ |
| ບັງຄັບຫຼັກຖານ | `REQUIRE_EVIDENCE_ON_RESOLVE` ໃນ [tickets/model.ts](../src/lib/tickets/model.ts) — ຕັ້ງເປັນ `false` ຖ້າຢາກໃຫ້ເປັນທາງເລືອກ |

> `next.config.ts` ຕັ້ງ `serverActions.bodySizeLimit` ເປັນ 45MB — ຄ່າປົກກະຕິ 1MB
> ນ້ອຍເກີນສຳລັບຮູບໜ້າຈໍ ແລະ ຈະລົ້ມແບບບໍ່ບອກສາເຫດ.

### ⚠️ ຢ່າ throw ຂໍ້ຄວາມແຈ້ງເຕືອນໃນ server action

`throw new Error('…')` ໃນ server action ຈະກາຍເປັນ **ໜ້າ Runtime Error ເຕັມຈໍ**
ເຊິ່ງເບິ່ງຄືລະບົບພັງ ທັງທີ່ເປັນພຽງການປ້ອນຂໍ້ມູນບໍ່ຄົບ.

```ts
// ❌ ຜູ້ໃຊ້ເຫັນໜ້າ error ແດງ
if (!resolution) throw new Error('ກະລຸນາບັນທຶກວິທີແກ້ໄຂ')

// ✅ ຂໍ້ຄວາມຂຶ້ນຢູ່ໃນຟອມ
if (!resolution) return { error: 'ກະລຸນາບັນທຶກວິທີແກ້ໄຂ' }
```

**ຮູບແບບ**: action ຮັບ `(prev: FormState, formData: FormData)` ແລະ ຄືນ
[`FormState`](../src/lib/action-state.ts) ສ່ວນຟອມໃຊ້
[`<ActionForm>`](../src/components/action-form.tsx) ເຊິ່ງສະແດງ `state.error` ໃຫ້ເອງ.
ສະຫງວນ `throw` ໄວ້ສະເພາະກໍລະນີທີ່ບໍ່ຄວນເກີດຂຶ້ນເລີຍ.

### ⚠️ ຂໍ້ຄວນລະວັງຂອງ PostgreSQL 11

ເຊີບເວີເປັນ **PG 11** ເຊິ່ງຄິດ type ຂອງ parameter ບໍ່ອອກ ເມື່ອ `$n` ດຽວກັນ
ຖືກໃຊ້ທັງເປັນຄ່າຂອງຄໍລຳ ແລະ ໃນການປຽບທຽບ — ຈະຂຶ້ນ error
`inconsistent types deduced for parameter $n` ຕອນ runtime ເທົ່ານັ້ນ.

```sql
-- ❌ ພັງ
set status = $2, resolved_at = case when $2 in ('resolved','closed') …

-- ✅ ຖືກ
set status = $2::varchar, resolved_at = case when $2::varchar in ('resolved','closed') …
```

**ກົດ**: ໃສ່ `::type` ໃຫ້ທຸກ parameter ໃນຄຳສັ່ງ `UPDATE`/`INSERT … SELECT`.
ຮັນ `npm run db:check-sql` ກ່ອນ commit — ມັນ PREPARE ທຸກຄຳສັ່ງ (86 ຄຳສັ່ງ)
ກັບຖານຂໍ້ມູນຈິງ ຈຶ່ງຈັບບັນຫານີ້ໄດ້ໂດຍບໍ່ຕ້ອງກົດຜ່ານໜ້າຈໍ.

## ໜ້າຕາ (Theme)

ໃຊ້ຊຸດອອກແບບດຽວກັນກັບ **ODG TMS** (`tms.odienmall.com`) ໃນ `src/app/globals.css`:

| ລາຍການ | ຄ່າ |
|---|---|
| ສີແບຣນ | navy `#003260` · blue `#2c6fb6` · sky `#4bc7ef` · orange `#f6921e` · yellow `#ffd071` |
| ພື້ນຫຼັງ | mesh gradient — ແຈ້ງ `#f5f9fd→#eaf3fb→#fdf6ec`, ມືດ `#04182a→#062338→#072b45` |
| ພື້ນຜິວ | glass (blur 16px + saturate 1.35) ຜ່ານ `.glass-card` / `.glass-heavy` / `.glass-subtle` |
| ຟອນ | Montserrat + Noto Sans Lao |
| ໂໝດມືດ | ຜ່ານ class `.dark` ເທິງ `<html>` + ປຸ່ມສະຫຼັບໃນ header (ຈື່ໃນ localStorage) |
| Utility | `.brand-gradient-cool/warm/text`, `.glow-primary`, `.btn-primary/secondary/danger`, `.input` |

### ໂຄງສ້າງໜ້າຈໍ

- **Sidebar** ([src/app/(app)/sidebar.tsx](../src/app/(app)/sidebar.tsx)) — ພື້ນ navy ເຂັ້ມເຕັມສູງ, ຫຍໍ້ໄດ້ (w-72 ↔ w-20),
  ເມນູແບ່ງເປັນໝວດພ້ອມໄອຄອນ ແລະ ເມນູຍ່ອຍທີ່ຂະຫຍາຍໄດ້. ໂຄງສ້າງເມນູຢູ່ໃນ
  [nav-config.tsx](../src/app/(app)/nav-config.tsx) ໄຟລ໌ດຽວ.
- **Topbar** ([topbar.tsx](../src/app/(app)/topbar.tsx)) — ຫົວຂໍ້ໜ້າ + breadcrumb ຄິດຈາກ path,
  ຊ່ອງຄົ້ນຫາ ticket, ກະດິ່ງແຈ້ງເຕືອນມີ badge, ປຸ່ມສະຫຼັບໂໝດ, chip ຜູ້ໃຊ້.
- **Hero card** ໜ້າພາບລວມ — gradient ຟ້າ ພ້ອມໂມງເດີນຈິງ, 4 ຕົວເລກສຳຄັນ ແລະ ປຸ່ມທາງລັດ.

> ຫົວຂໍ້ໜ້າສະແດງຢູ່ topbar ບ່ອນດຽວ — ໜ້າຕ່າງໆບໍ່ຕ້ອງມີ `<h1>` ຊ້ຳ
> (ຍົກເວັ້ນຫົວຂໍ້ແບບ dynamic ເຊັ່ນຊື່ ticket ຫຼື ຊື່ໂປຣເຈັກ).

## 1. ໂຄງສ້າງອົງກອນ — ມີຢູ່ໃນ DB ແລ້ວ (schema `public`)

ບໍ່ຕ້ອງສ້າງຕາຕະລາງພະນັກງານໃໝ່ — ໃຊ້ຂອງເກົ່າທີ່ໃຊ້ຮ່ວມກັນທັງບໍລິສັດ:

| ຕາຕະລາງ | ຄີ | ໝາຍເຫດ |
|---|---|---|
| `public.odg_division` | `division_code` | `800` = ສາຍງານ IT |
| `public.odg_department` | `department_code` | **`801` = ພະແນກໄອທີ** |
| `public.odg_unit` | `unit_code` | **`8010` = ໜ່ວຍງານ support**, **`8011` = ໜ່ວຍງານພັດທະນາລະບົບ** |
| `public.odg_position` | `position_code` | `11` = ຜູ້ຈັດການ (`is_manager=true`), `12` = ຫົວໜ້າໜ່ວຍງານ, `13` = ພະນັກງານ |
| `public.odg_employee` | `employee_id` / `employee_code` | 256 ຄົນທັງບໍລິສັດ, ໃນ 801 ມີ 5 ຄົນ. ມີ `password`, `app_role`, `line_id`, `mobile` ຢູ່ແລ້ວ |

```
ພະແນກໄອທີ (801)
├── ໜ່ວຍງານພັດທະນາລະບົບ (8011) — ຫົວໜ້າ + developer
└── ໜ່ວຍງານ support (8010) — support staff
        ຜູ້ຈັດການ (position 11) ຄຸມທັງ 2 ໜ່ວຍງານ
```

**ຫຼັກການ**: ຕາຕະລາງໃໝ່ຂອງລະບົບນີ້ຢູ່ schema `it` ທັງໝົດ ແລະ ອ້າງອີງພະນັກງານດ້ວຍ `employee_id`
(ບໍ່ copy ຊື່/ຕຳແໜ່ງມາເກັບຊ້ຳ — join ເອົາ ເພື່ອບໍ່ໃຫ້ຂໍ້ມູນຂັດກັນເມື່ອ HR ອັບເດດ)

## 2. ບົດບາດ ແລະ ສິດ (Roles & Permissions)

Role **ບໍ່ຕ້ອງປ້ອນມື** — ຄິດຈາກ `position_code` + `unit_code` ທີ່ມີຢູ່ແລ້ວ:

| ເງື່ອນໄຂໃນ `odg_employee` | Role | ຂອບເຂດຂໍ້ມູນ | ສິດຫຼັກ |
|---|---|---|---|
| dept `801` + position `11` | `manager` | ທັງພະແນກ | dashboard ລວມ, ອະນຸມັດຂັ້ນສຸດທ້າຍ, ຈັດການສິດ, KPI |
| dept `801` + position `12` | `head` | ໜ່ວຍງານຕົນ (`unit_code`) | ມອບໝາຍວຽກ, ອະນຸມັດຂັ້ນ 1, ຈັດລຳດັບຄວາມສຳຄັນ |
| dept `801` + unit `8011` + position `13` | `developer` | ວຽກຂອງຕົນ | ຮັບ task, ອັບເດດຄວາມຄືບໜ້າ, log ຊົ່ວໂມງ |
| dept `801` + unit `8010` + position `13` | `support` | ticket ຂອງຕົນ | ຮັບ ticket, ຕອບຜູ້ແຈ້ງ, ບັນທຶກການແກ້ໄຂ, ຈັດການ asset |

> **ຂອບເຂດຜູ້ໃຊ້: ສະເພາະພະແນກໄອທີ (801) ເທົ່ານັ້ນ**
> ຄົນທີ່ login ໄດ້ = ພະນັກງານ dept `801` + `employment_status = 'ACTIVE'` (ປັດຈຸບັນ 5 ຄົນ).
> ພະນັກງານພະແນກອື່ນ **ບໍ່ມີ account** — ແຕ່ຍັງຖືກອ້າງອີງເປັນ "ຜູ້ແຈ້ງ" ໃນ ticket ໄດ້
> (ເລືອກຈາກ `odg_employee` ທັງ 256 ຄົນ) ໂດຍ IT support ເປັນຜູ້ບັນທຶກແທນ.
> ຖ້າພາຍຫຼັງຢາກເປີດໃຫ້ພະແນກອື່ນແຈ້ງເອງ ຄ່ອຍເພີ່ມ role `requester` ພາຍຫຼັງໄດ້ ໂດຍບໍ່ຕ້ອງແກ້ໂຄງສ້າງ.

ສຳລັບກໍລະນີຍົກເວັ້ນ (ເຊັ່ນ ໃຫ້ຄົນນອກພະແນກເປັນ admin) ໃຊ້ຕາຕະລາງ `it.user_role_override`
ທີ່ override ຜົນຄິດອັດຕະໂນມັດ — ບໍ່ຕ້ອງໄປແກ້ຂໍ້ມູນ HR.

ໃຊ້ຮູບແບບ **RBAC + scope**: ສິດ = role ＋ `unit_code`. ຢ່າ hardcode `if (role === 'manager')`
ກະຈາຍທົ່ວ code — ໃຫ້ລວມໄວ້ບ່ອນດຽວ (`src/lib/auth/permissions.ts`).

## 3. ໂມດູນທີ່ຄວນມີ (ຈັດລຳດັບຕາມຄວາມສຳຄັນ)

### ໄລຍະ 1 — ຫຼັກ (ຄວນເຮັດກ່ອນ)
1. **Auth & Users** — login, ໂປຣໄຟລ໌, role, ໜ່ວຍງານ, ສະຖານະພະນັກງານ
2. **Helpdesk / Ticket** (ຫົວໃຈຂອງໜ່ວຍ Support)
   - ພະນັກງານພະແນກອື່ນແຈ້ງບັນຫາ → ລະບົບອອກເລກ ticket
   - ຈັດປະເພດ: Hardware / Software / Network / Account / ອື່ນໆ
   - ລະດັບ: Low / Medium / High / Critical
   - ຂັ້ນຕອນ: `new → assigned → in_progress → pending (ລໍຂໍ້ມູນ) → resolved → closed`
   - SLA: ກຳນົດເວລາຕອບ ແລະ ເວລາແກ້ໄຂຕາມລະດັບ
3. **Dashboard** — ຕົວເລກສຳຄັນຕໍ່ role (ticket ຄ້າງ, ເກີນ SLA, ວຽກມື້ນີ້)

### ໄລຍະ 2 — ວຽກພັດທະນາ
4. **Project & Task** (ໜ່ວຍພັດທະນາ)
   - Project → Sprint/ໄລຍະ → Task → Subtask
   - ສະຖານະ: `backlog → todo → in_progress → review → testing → done`
   - ມີ Kanban board + ປະຕິທິນ
5. **Work Log / Timesheet** — ບັນທຶກຊົ່ວໂມງຕໍ່ task/ticket (ໃຊ້ຄິດ workload ແລະ ລາຍງານ)
6. **Request & Approval** — ຄຳຮ້ອງຂໍພັດທະນາລະບົບໃໝ່ / ຂໍອຸປະກອນ → head ອະນຸມັດ → manager ອະນຸມັດ

### ໄລຍະ 3 — ສະໜັບສະໜູນ
7. **Asset / Inventory** — ຄອມ, printer, server, license, ໃຜຖື, ວັນໝົດປະກັນ
8. **Knowledge Base** — ວິທີແກ້ບັນຫາທີ່ພົບເລື້ອຍ (ຫຼຸດ ticket ຊ້ຳ)
9. **Report & KPI** — ticket ຕໍ່ຄົນ/ຕໍ່ເດືອນ, ເວລາແກ້ໄຂສະເລ່ຍ, % ຕາມ SLA, ຄວາມຄືບໜ້າໂປຣເຈັກ
10. **Notification** — ໃນລະບົບ + email/LINE ເມື່ອຖືກມອບໝາຍ ຫຼື ໃກ້ເກີນ SLA
11. **Audit Log** — ໃຜແກ້ຫຍັງ ເມື່ອໃດ (ສຳຄັນສຳລັບລະບົບບໍລິຫານ)

## 4. ຂັ້ນຕອນການເຮັດວຽກ (Workflow)

### ກະແສ Ticket (Support)
```
ຜູ້ແຈ້ງສ້າງ ticket
      ↓
ລະບົບຈັດເຂົ້າຄິວ + ແຈ້ງເຕືອນຫົວໜ້າ Support
      ↓
ຫົວໜ້າມອບໝາຍ (ຫຼື support ຮັບເອງ)  ── ຈັບເວລາ SLA
      ↓
support ດຳເນີນການ → ບັນທຶກການແກ້ໄຂ + ຊົ່ວໂມງ
      ↓
resolved → ຜູ້ແຈ້ງຢືນຢັນ (ຫຼື auto-close ໃນ 3 ມື້)
      ↓
closed → ເຂົ້າ report + ຖ້າເປັນບັນຫາເລື້ອຍ → ຂຽນເຂົ້າ Knowledge Base
```

### ກະແສວຽກພັດທະນາ
```
ຄຳຮ້ອງຈາກພະແນກອື່ນ / manager
      ↓
ຫົວໜ້າພັດທະນາປະເມີນຂອບເຂດ + ເວລາ
      ↓
manager ອະນຸມັດ → ເປີດເປັນ Project
      ↓
ແຕກເປັນ Task → ມອບໝາຍ developer
      ↓
in_progress → review (ຫົວໜ້າກວດ) → testing (ຜູ້ໃຊ້ທົດສອບ)
      ↓
done → deploy → ປິດ Project + ສະຫຼຸບບົດຮຽນ
```

### ຈັງຫວະການເຮັດວຽກປະຈຳ
- **ທຸກເຊົ້າ**: ແຕ່ລະໜ່ວຍງານເບິ່ງ dashboard ຂອງຕົນ (ticket ຄ້າງ, task ມື້ນີ້)
- **ທຸກອາທິດ**: ຫົວໜ້າສະຫຼຸບໃຫ້ manager (ຜົນງານ + ບັນຫາຄ້າງ)
- **ທຸກເດືອນ**: manager ເບິ່ງ KPI report ຕໍ່ຄົນ ແລະ ຕໍ່ໜ່ວຍງານ

## 5. ໂຄງສ້າງຂໍ້ມູນ (schema `it`)

**ບໍ່ສ້າງ** `users` / `departments` / `positions` — ໃຊ້ຂອງ `public` ຕາມຂໍ້ 1.
ແທນທີ່ດ້ວຍ view ດຽວທີ່ກັ່ນເອົາສະເພາະຄົນ IT ພ້ອມ role:

```sql
-- it.v_it_staff : 5 ຄົນຂອງພະແນກ 801 ພ້ອມ role ທີ່ຄິດອັດຕະໂນມັດ
create view it.v_it_staff as
select e.employee_id, e.employee_code, e.fullname_lo, e.nickname,
       e.unit_code, u.unit_name_lo, e.position_code, p.position_name_lo,
       coalesce(o.role,
         case when p.is_manager then 'manager'
              when e.position_code = '12' then 'head'
              when e.unit_code = '8011' then 'developer'
              when e.unit_code = '8010' then 'support'
              else 'staff' end) as role
  from public.odg_employee e
  join public.odg_position p on p.position_code = e.position_code
  left join public.odg_unit u on u.unit_code = e.unit_code
  left join it.user_role_override o on o.employee_id = e.employee_id
 where e.department_code = '801' and e.employment_status = 'ACTIVE';
```

ຕາຕະລາງໃໝ່ໃນ schema `it`:

```
user_role_override  ຍົກເວັ້ນ role → employee_id, role, note
tickets             ticket → requester_employee_id (ໄດ້ທຸກພະແນກ),
                    assignee_employee_id (ສະເພາະ IT), category, priority,
                    status, sla_due_at, resolved_at, closed_at
ticket_comments     ການສົນທະນາ / ບັນທຶກການແກ້ໄຂ
projects            ໂປຣເຈັກພັດທະນາ → owner_employee_id, status, start/end date
tasks               task → project_id, assignee_employee_id, status, priority, due_date
work_logs           ຊົ່ວໂມງເຮັດວຽກ → employee_id, ticket_id/task_id, hours, log_date
assets              ອຸປະກອນ → code, type, assigned_employee_id, warranty_until
requests            ຄຳຮ້ອງ → type, requester_employee_id, status
approvals           ການອະນຸມັດ → request_id, approver_employee_id, level, decision
kb_articles         ຄັງຄວາມຮູ້
notifications       ການແຈ້ງເຕືອນ
audit_logs          ບັນທຶກການປ່ຽນແປງ
```

ຫຼັກການ:
- ທຸກຕາຕະລາງມີ `created_at`, `updated_at`, `created_by` (= `employee_id`)
- ບໍ່ລຶບຂໍ້ມູນຈິງ ໃຫ້ໃຊ້ `deleted_at` (soft delete)
- ຄໍລຳທີ່ອ້າງຄົນ ຕັ້ງຊື່ລົງທ້າຍ `_employee_id` ສະເໝີ ເພື່ອບອກວ່າ join ໄປ `public.odg_employee`

## 6. ເທັກໂນໂລຢີ

- **Next.js 16 (App Router) + TypeScript + Tailwind** — ມີແລ້ວ
- **PostgreSQL** `odg` schema `it` — ຕໍ່ແລ້ວຜ່ານ `src/lib/db.ts`
- **Server Actions / Route Handlers** ສຳລັບ mutation — ບໍ່ຕ້ອງມີ backend ແຍກ
- **Migration**: ໄຟລ໌ SQL ໃນ `db/migrations/` ຮັນຕາມລຳດັບດ້ວຍ `npm run db:migrate`
  (ບັນທຶກໄວ້ໃນ `it.schema_migrations` — ຮັນຊ້ຳໄດ້ ບໍ່ເຮັດວຽກຊ້ຳ)

### Auth — ສະຖານະຕົວຈິງ

ລະຫັດຜ່ານໃນ `public.odg_employee.password` ມີ **3 ຮູບແບບປົນກັນ** (ຂຽນໂດຍແອັບພາຍໃນຫຼາຍໂຕ):

| ຮູບແບບ | ຈຳນວນ |
|---|---|
| plaintext (ຍາວ 4–10 ຕົວ) | 233 ຄົນ — **ລວມທັງ 5 ຄົນຂອງພະແນກ IT** |
| `scrypt$salt$hex` | 20 ຄົນ |
| `scrypt:32768:8:1$salt$hex` (Werkzeug) | 2 ຄົນ |

`src/lib/auth/password.ts` ຮອງຮັບໝົດທັງ 3 ແບບ ແລະ **ອ່ານຢ່າງດຽວ ບໍ່ຂຽນທັບ**
— ເພາະຕາຕະລາງນີ້ແອັບອື່ນໃຊ້ຮ່ວມ ຖ້າປ່ຽນ hash ອາດເຮັດໃຫ້ລະບົບອື່ນ login ບໍ່ໄດ້.

> ⚠️ **ຄວນແກ້**: ລະຫັດຜ່ານ plaintext ຍາວ 4–5 ຕົວ ເປັນຄວາມສ່ຽງດ້ານຄວາມປອດໄພ.
> ຄວນວາງແຜນຮ່ວມກັບເຈົ້າຂອງລະບົບ HR ເພື່ອປ່ຽນເປັນ scrypt ໃຫ້ໝົດ ແລ້ວບັງຄັບຄວາມຍາວຂັ້ນຕ່ຳ.

Session ເກັບໃນ `it.sessions` (token ສຸ່ມ 32 bytes ໃນ httpOnly cookie, ໝົດອາຍຸ 8 ຊົ່ວໂມງ,
ຖອນສິດໄດ້) — ບໍ່ໄປແຕະລະບົບ auth ຂອງແອັບອື່ນ. ທຸກຄັ້ງທີ່ login ບັນທຶກໃນ `it.login_attempts`.

## 7. ຄຳແນະນຳສຳຄັນ

1. **ຢ່າສ້າງທຸກໂມດູນພ້ອມກັນ** — ເລີ່ມຈາກ Ticket ຢ່າງດຽວໃຫ້ໃຊ້ງານຈິງກ່ອນ ຄ່ອຍຂະຫຍາຍ
2. **ຂໍ້ມູນຕົ້ນສະບັບຕ້ອງຖືກ** — users, departments, positions ຕ້ອງກົງກັບຄວາມຈິງກ່ອນເປີດໃຊ້
3. **SLA ຄືຫົວໃຈ** — ຖ້າບໍ່ວັດເວລາ ກໍ່ບໍ່ຮູ້ວ່າພະແນກເຮັດວຽກດີບໍ່
4. **ໃຫ້ພະແນກອື່ນແຈ້ງເອງໄດ້** — ຫຼຸດການແຈ້ງທາງ chat/ໂທ ທີ່ຕິດຕາມບໍ່ໄດ້
5. **ລາຍງານຕ້ອງອອກອັດຕະໂນມັດ** — manager ບໍ່ຄວນຕ້ອງລວມ Excel ເອງ
