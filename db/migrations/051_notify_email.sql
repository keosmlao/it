-- 051_notify_email.sql
-- ຊ່ອງທາງແຈ້ງເຕືອນທາງອີເມວ
--
-- ເຫດຜົນ: 026 ອອກແບບຄິວໃຫ້ຮອງຮັບ 'email' ໄວ້ແລ້ວ ແຕ່**ຍັງບໍ່ໄດ້ຂຽນຕົວສົ່ງ**
-- ແລະ ສຳຄັນກວ່ານັ້ນ — `public.odg_employee` **ບໍ່ມີຄໍລຳອີເມວເລີຍ** ຈຶ່ງບໍ່ຮູ້
-- ວ່າຈະສົ່ງໄປໃສ. ຄົນທີ່ບໍ່ໄດ້ຜູກ LINE ຈຶ່ງຖືກໝາຍວ່າ `skipped` ແລ້ວບໍ່ໄດ້ຮັບຫຍັງ
--
-- ບໍ່ໄປເພີ່ມຄໍລຳໃນຕາຕະລາງ HR ທີ່ແອັບອື່ນໃຊ້ຮ່ວມ — ເກັບໄວ້ໃນ schema `it`
-- ຂອງລະບົບນີ້ເອງ ຄືກັບຫຼັກການຂອງໂມດູນອື່ນທັງໝົດ

create table if not exists it.employee_emails (
  employee_id integer primary key,
  email       varchar(150) not null,
  note        varchar(200),
  updated_by  integer not null,
  updated_at  timestamptz not null default now()
);

-- ອີເມວດຽວກັນຜູກສອງຄົນບໍ່ໄດ້ — ກັນສົ່ງຜິດຄົນ
create unique index if not exists employee_emails_addr_idx
  on it.employee_emails (lower(email));

-- ຕໍ່ຄໍລຳໃສ່ທ້າຍ v_notify_targets (ຕໍ່ທ້າຍໄດ້ຢ່າງດຽວ ແຊກກາງບໍ່ໄດ້)
create or replace view it.v_notify_targets as
select e.employee_id,
       e.employee_code,
       e.fullname_lo,
       nullif(trim(coalesce(e.line_id, '')), '') as line_target,
       coalesce(p.enabled, true)                 as line_enabled,
       e.employment_status = 'ACTIVE'            as is_active,
       em.email                                  as email_target,
       coalesce(pe.enabled, true)                as email_enabled
  from public.odg_employee e
  left join it.notify_prefs p
         on p.employee_id = e.employee_id and p.channel = 'line'
  left join it.notify_prefs pe
         on pe.employee_id = e.employee_id and pe.channel = 'email'
  left join it.employee_emails em on em.employee_id = e.employee_id;
