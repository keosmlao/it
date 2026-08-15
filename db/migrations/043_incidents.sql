-- 043_incidents.sql
-- ບັນທຶກເຫດຂັດຂ້ອງຂອງລະບົບ (incident / downtime)
--
-- ເຫດຜົນ: ticket ຄືບັນຫາ "ຂອງຄົນໜຶ່ງ" ແຕ່ "ອິນເຕີເນັດຫຼຸດ 2 ຊົ່ວໂມງ" ຫຼື
-- "ERP ລົ້ມທັງເຊົ້າ" ເປັນບັນຫາ "ຂອງລະບົບ" ທີ່ກະທົບຫຼາຍຄົນພ້ອມກັນ —
-- ດຽວນີ້ບໍ່ມີບ່ອນເກັບ ຈຶ່ງຕອບບໍ່ໄດ້ວ່າປີນີ້ເນັດຫຼຸດຈັກເທື່ອ ລວມກີ່ຊົ່ວໂມງ
--
-- ຜູກກັບ it.subscriptions ໄດ້ → ມີຕົວເລກຈິງໄປຕໍ່ລອງກັບຜູ້ໃຫ້ບໍລິການ
-- ຫຼື ຕັດສິນໃຈວ່າຄວນປ່ຽນເຈົ້າບໍ

create table if not exists it.incident_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create or replace function it.next_incident_code() returns varchar
language plpgsql as $fn$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.incident_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.incident_counters.last_no + 1
  returning last_no into n;

  return 'INC-' || y::text || lpad(n::text, 4, '0');
end $fn$;

create table if not exists it.incidents (
  id              bigserial primary key,
  code            varchar(20) not null unique default it.next_incident_code(),
  title           varchar(200) not null,
  service         varchar(20) not null
                  check (service in ('internet','power','erp','mail','network',
                                     'server','cloud','phone','cctv','other')),
  -- ບໍລິການທີ່ເຊົ່າອັນໃດລົ້ມ (ຖ້າຜູກໄດ້) — ໃຊ້ຄິດ uptime ຕໍ່ສັນຍາ
  subscription_id bigint references it.subscriptions(id) on delete set null,
  asset_code      varchar(40),
  severity        varchar(10) not null default 'major'
                  check (severity in ('critical','major','minor')),
  -- ຂອບເຂດຜົນກະທົບ: ບອກເປັນຄຳເວົ້າ ບໍ່ບັງຄັບໃຫ້ນັບຄົນ ເພາະນັບບໍ່ໄດ້ຈິງ
  impact          varchar(300),
  started_at      timestamptz not null,
  resolved_at     timestamptz,
  cause           text,
  action          text,
  prevention      text,
  status          varchar(10) not null default 'open'
                  check (status in ('open','resolved')),
  ticket_id       bigint references it.tickets(id) on delete set null,
  reported_by     varchar(120),
  created_by      integer not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (resolved_at is null or resolved_at >= started_at)
);

create index if not exists incidents_started_idx on it.incidents (started_at desc);
create index if not exists incidents_service_idx on it.incidents (service, started_at desc);

create or replace view it.v_incidents as
select i.id,
       i.code,
       i.title,
       i.service,
       i.subscription_id,
       s.service_name                                   as subscription_name,
       i.asset_code,
       a.name                                           as asset_name,
       i.severity,
       i.impact,
       i.started_at,
       i.resolved_at,
       i.cause,
       i.action,
       i.prevention,
       i.status,
       i.ticket_id,
       t.ticket_no,
       i.reported_by,
       i.created_by,
       e.fullname_lo                                    as created_by_name,
       i.created_at,
       i.updated_at,
       -- ຍັງບໍ່ຈົບ = ນັບຮອດດຽວນີ້ ຈຶ່ງເຫັນວ່າຄ້າງມາດົນເທົ່າໃດແລ້ວ
       round(extract(epoch from
             coalesce(i.resolved_at, now()) - i.started_at) / 60)::integer
                                                        as minutes,
       to_char(i.started_at, 'YYYY-MM')                 as month
  from it.incidents i
  left join it.subscriptions s on s.id = i.subscription_id
  left join it.v_it_assets a on a.asset_code::text = i.asset_code::text
  left join it.tickets t on t.id = i.ticket_id
  left join public.odg_employee e on e.employee_id = i.created_by;
