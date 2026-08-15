-- 042_maintenance.sql
-- ບຳລຸງຮັກສາຕາມແຜນ (preventive maintenance)
--
-- ເຫດຜົນ: ວຽກທີ່ຕ້ອງເຮັດຊໍ້າຕາມຮອບ — ກວດແບັດ UPS, ລ້າງຫ້ອງ server,
-- ອັບເດດ firmware, **ທົດສອບກູ້ຄືນ backup**, ກວດ CCTV — ດຽວນີ້ອາໄສຄວາມຈຳຄົນ
-- ຢ່າງດຽວ. ບໍ່ໄດ້ເຮັດແລ້ວບໍ່ມີໃຜຮູ້ ຈົນກວ່າຈະເກີດເລື່ອງ
--
-- ໃຊ້ຮູບແບບກຳນົດ–ເຕືອນອັນດຽວກັບ 040 (next_due_date + ຕາຕະລາງບັນທຶກການເຕືອນ)
-- ຈຶ່ງໃຊ້ວຽກຕາມຕາຕະລາງໂຕດຽວກັນສົ່ງ LINE ໄດ້
--
-- ຮອບຄິດເປັນ "ຈຳນວນວັນ" ບໍ່ແມ່ນເດືອນ ເພາະວຽກແບບນີ້ຈິງໆເວົ້າກັນເປັນ
-- ທຸກ 7 / 30 / 90 / 180 / 365 ວັນ ບໍ່ໄດ້ຜູກກັບວັນທີໃນເດືອນ

create table if not exists it.maintenance_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create or replace function it.next_maintenance_code() returns varchar
language plpgsql as $fn$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.maintenance_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.maintenance_counters.last_no + 1
  returning last_no into n;

  return 'PM-' || y::text || lpad(n::text, 4, '0');
end $fn$;

create table if not exists it.maintenance_plans (
  id                bigserial primary key,
  code              varchar(20) not null unique default it.next_maintenance_code(),
  title             varchar(150) not null,
  category          varchar(20) not null
                    check (category in ('backup','ups','server_room','network',
                                        'cctv','printer','security','other')),
  -- ຜູກກັບເຄື່ອງໃດເຄື່ອງໜຶ່ງກໍໄດ້ ຫຼື ປະວ່າງໄວ້ຖ້າເປັນວຽກລວມ
  asset_code        varchar(40),
  location_code     varchar(20),
  interval_days     integer not null check (interval_days between 1 and 3650),
  next_due_date     date not null,
  last_done_at      date,
  owner_employee_id integer,
  checklist         text,
  is_active         boolean not null default true,
  created_by        integer not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists maintenance_plans_due_idx
  on it.maintenance_plans (is_active, next_due_date);

create table if not exists it.maintenance_logs (
  id           bigserial primary key,
  plan_id      bigint references it.maintenance_plans(id) on delete cascade,
  performed_at date not null default current_date,
  -- 'issue' = ເຮັດແລ້ວແຕ່ພົບບັນຫາ ຕ້ອງຕິດຕາມຕໍ່ · 'skipped' = ຂ້າມຮອບນີ້
  result       varchar(10) not null default 'ok'
               check (result in ('ok','issue','skipped')),
  note         text,
  ticket_id    bigint references it.tickets(id) on delete set null,
  minutes      integer check (minutes is null or minutes between 0 and 10000),
  created_by   integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists maintenance_logs_plan_idx
  on it.maintenance_logs (plan_id, performed_at desc);

create table if not exists it.maintenance_reminders (
  plan_id     bigint not null references it.maintenance_plans(id) on delete cascade,
  due_date    date not null,
  days_before integer not null,
  sent_at     timestamptz not null default now(),
  primary key (plan_id, due_date, days_before)
);

create or replace view it.v_maintenance_plans as
select p.id,
       p.code,
       p.title,
       p.category,
       p.asset_code,
       a.name                                        as asset_name,
       p.location_code,
       loc.name_1                                    as location_name,
       p.interval_days,
       p.next_due_date,
       p.last_done_at,
       p.owner_employee_id,
       owner.fullname_lo                             as owner_name,
       owner.nickname                                as owner_nickname,
       p.checklist,
       p.is_active,
       p.created_by,
       creator.fullname_lo                           as created_by_name,
       p.created_at,
       p.updated_at,
       p.next_due_date - current_date                as days_to_due,
       case
         when not p.is_active                        then 'inactive'
         when p.next_due_date < current_date         then 'overdue'
         when p.next_due_date <= current_date + 7    then 'due_soon'
         else 'ok'
       end                                           as due_status,
       coalesce(l.total, 0)                          as log_count,
       coalesce(l.issues, 0)                         as issue_count
  from it.maintenance_plans p
  left join it.v_it_assets a on a.asset_code::text = p.asset_code::text
  left join public.as_asset_location loc on loc.code::text = p.location_code::text
  left join public.odg_employee owner   on owner.employee_id   = p.owner_employee_id
  left join public.odg_employee creator on creator.employee_id = p.created_by
  left join (select plan_id,
                    count(*)                              as total,
                    count(*) filter (where result = 'issue') as issues
               from it.maintenance_logs group by plan_id) l on l.plan_id = p.id;

create or replace view it.v_maintenance_logs as
select l.id,
       l.plan_id,
       p.code                    as plan_code,
       p.title                   as plan_title,
       p.category,
       l.performed_at,
       l.result,
       l.note,
       l.minutes,
       l.ticket_id,
       t.ticket_no,
       l.created_by,
       e.fullname_lo             as performed_by_name,
       l.created_at
  from it.maintenance_logs l
  join it.maintenance_plans p on p.id = l.plan_id
  left join it.tickets t on t.id = l.ticket_id
  left join public.odg_employee e on e.employee_id = l.created_by;
