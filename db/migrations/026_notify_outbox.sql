-- 026_notify_outbox.sql
-- ສົ່ງການແຈ້ງເຕືອນອອກນອກລະບົບ (LINE ກ່ອນ, ຊ່ອງທາງອື່ນຕໍ່ພາຍຫຼັງ)
--
-- ຂໍ້ມູນທີ່ມີຢູ່: public.odg_employee.line_id ມີແລ້ວ 227/256 ຄົນ (ພະນັກງານ IT
-- ຄົບທັງ 5 ຄົນ) ແຕ່**ບໍ່ມີຄໍລຳ email** ໃນທະບຽນພະນັກງານເລີຍ ຈຶ່ງສົ່ງອີເມວບໍ່ໄດ້
-- ຈົນກວ່າຈະມີທີ່ຢູ່ອີເມວ — ຕາຕະລາງນີ້ອອກແບບໃຫ້ຮອງຮັບຫຼາຍຊ່ອງທາງໄວ້ແລ້ວ.
--
-- ເປັນ outbox: ບັນທຶກກ່ອນ ສົ່ງທີຫຼັງ ຈຶ່ງບໍ່ເສຍການແຈ້ງເຕືອນເມື່ອ LINE ລົ້ມ
-- ແລະ ລອງສົ່ງໃໝ່ໄດ້ ໂດຍບໍ່ຕ້ອງໃຫ້ຜູ້ໃຊ້ລໍຢູ່ໜ້າຈໍ

create table it.notification_outbox (
  id              bigserial primary key,
  notification_id bigint references it.notifications(id) on delete set null,
  employee_id     integer not null,
  channel         varchar(20) not null default 'line'
                  check (channel in ('line', 'email', 'webhook')),
  target          varchar(200),          -- line_user_id / ທີ່ຢູ່ອີເມວ
  title           varchar(200) not null,
  body            text,
  link            varchar(200),
  status          varchar(20) not null default 'pending'
                  check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts        integer not null default 0,
  last_error      text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

-- ຄິວທີ່ຍັງລໍສົ່ງ — ດຶງເທື່ອລະຊຸດ
create index notification_outbox_pending_idx
  on it.notification_outbox (created_at)
  where status = 'pending';

create index notification_outbox_employee_idx
  on it.notification_outbox (employee_id, created_at desc);

-- ໃຜປິດການແຈ້ງເຕືອນຊ່ອງທາງໃດ (ບໍ່ມີແຖວ = ເປີດ)
create table it.notify_prefs (
  employee_id integer not null,
  channel     varchar(20) not null check (channel in ('line', 'email', 'webhook')),
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (employee_id, channel)
);

-- ຜູ້ຮັບພ້ອມທີ່ຢູ່ປາຍທາງ ແລະ ການຕັ້ງຄ່າ
create view it.v_notify_targets as
select e.employee_id,
       e.employee_code,
       e.fullname_lo,
       nullif(trim(coalesce(e.line_id, '')), '') as line_target,
       coalesce(p.enabled, true)                 as line_enabled,
       e.employment_status = 'ACTIVE'            as is_active
  from public.odg_employee e
  left join it.notify_prefs p
         on p.employee_id = e.employee_id and p.channel = 'line';
