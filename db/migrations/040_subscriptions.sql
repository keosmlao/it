-- 040_subscriptions.sql
-- ທະບຽນຄ່າເຊົ່າບໍລິການລາຍງວດ — ອິນເຕີເນັດ, cloud, mail server, AI, domain, ໃບອະນຸຍາດ…
--
-- ເຫດຜົນ: ບໍລິການເຫຼົ່ານີ້ບໍ່ແມ່ນ "ຊັບສິນ" — ບໍ່ມີ serial, ບໍ່ມີຜູ້ຖືຄອງ,
-- ຢືມ–ຄືນບໍ່ໄດ້ ແຕ່ຈ່າຍຊໍ້າທຸກເດືອນ/ປີ ແລະ ຖ້າຂາດຕໍ່ອາຍຸບໍລິການລົ້ມທັນທີ.
-- ຈຶ່ງບໍ່ຍັດເຂົ້າ it.local_assets ແຕ່ແຍກເປັນໂມດູນຂອງມັນເອງ.
--
-- ແບ່ງເປັນ 2 ຊັ້ນ:
--   subscriptions        = ສັນຍາ (ຂາຍໂດຍໃຜ, ແພັກເກັດໃດ, ຮອບຈ່າຍໃດ, ໃຜຮັບຜິດຊອບ)
--   subscription_periods = ແຕ່ລະງວດທີ່ຈ່າຍຈິງ (ລາຄາປ່ຽນໄດ້, ມີເລກໃບບິນ)
-- ຖ້າເກັບແຖວດຽວ ລາຄາໃໝ່ຈະທັບຂອງເກົ່າ ແລ້ວສະຫຼຸບຄ່າໃຊ້ຈ່າຍຍ້ອນຫຼັງບໍ່ໄດ້
--
-- ⚠️ ບໍ່ເກັບລະຫັດຜ່ານ ຫຼື API key ຢູ່ນີ້ — ເກັບພຽງ "ບັນຊີຊື່ຫຍັງ ຢູ່ບ່ອນໃດ"
--    ເພາະຕາຕະລາງນີ້ຜູ້ໃຊ້ພະແນກ IT ອ່ານໄດ້ທຸກຄົນ ແລະ ດຶງອອກ Excel ໄດ້

-- ---------- ລະຫັດສັນຍາ SUB-ປີ-ລຳດັບ ----------
-- ໃຊ້ຮູບແບບດຽວກັບ it.next_local_asset_code() ເພື່ອໃຫ້ຄົນອ່ານແລ້ວຮູ້ທັນທີວ່າແມ່ນຫຍັງ
create table if not exists it.subscription_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create or replace function it.next_subscription_code() returns varchar
language plpgsql as $fn$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.subscription_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.subscription_counters.last_no + 1
  returning last_no into n;

  return 'SUB-' || y::text || lpad(n::text, 4, '0');
end $fn$;

-- ---------- ສັນຍາ ----------
create table if not exists it.subscriptions (
  id                bigserial primary key,
  code              varchar(20) not null unique default it.next_subscription_code(),
  category          varchar(20) not null
                    check (category in ('internet','cloud','mail','ai','domain',
                                        'ssl','license','hosting','other')),
  service_name      varchar(150) not null,
  vendor            varchar(150),
  plan_name         varchar(150),
  -- ບັນຊີ/ເລກສັນຍາທີ່ໃຊ້ອ້າງອີງກັບຜູ້ຂາຍ — ບໍ່ແມ່ນລະຫັດຜ່ານ
  account_ref       varchar(150),
  admin_url         varchar(300),
  billing_cycle     varchar(12) not null
                    check (billing_cycle in ('monthly','quarterly','yearly','one_time')),
  amount            numeric(14,2) not null default 0 check (amount >= 0),
  -- ເກັບສະກຸນຕາມທີ່ຈ່າຍຈິງ ບໍ່ແປງເປັນກີບຕອນບັນທຶກ (ອັດຕາປ່ຽນທຸກມື້)
  currency          varchar(3) not null default 'LAK'
                    check (currency in ('LAK','THB','USD','CNY')),
  start_date        date not null default current_date,
  end_date          date,
  next_due_date     date,
  auto_renew        boolean not null default true,
  owner_employee_id integer,
  department_code   varchar(20),
  status            varchar(12) not null default 'active'
                    check (status in ('active','cancelled','expired')),
  cancelled_at      date,
  cancel_reason     varchar(200),
  note              text,
  created_by        integer not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists subscriptions_due_idx
  on it.subscriptions (status, next_due_date);
create index if not exists subscriptions_category_idx
  on it.subscriptions (category, status);

-- ---------- ງວດການຈ່າຍ ----------
create table if not exists it.subscription_periods (
  id              bigserial primary key,
  subscription_id bigint not null references it.subscriptions(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  due_date        date not null,
  amount          numeric(14,2) not null check (amount >= 0),
  currency        varchar(3) not null,
  status          varchar(10) not null default 'unpaid'
                  check (status in ('unpaid','paid','waived')),
  paid_at         date,
  invoice_no      varchar(60),
  note            varchar(300),
  created_by      integer not null,
  created_at      timestamptz not null default now(),
  check (period_end >= period_start)
);

-- ງວດດຽວກັນບັນທຶກສອງເທື່ອບໍ່ໄດ້ — ກັນຈ່າຍຊໍ້າ ແລະ ກັນຍອດລາຍງານເກີນຄວາມຈິງ
create unique index if not exists subscription_periods_unique_idx
  on it.subscription_periods (subscription_id, period_start);
create index if not exists subscription_periods_due_idx
  on it.subscription_periods (status, due_date);

-- ---------- ບັນທຶກວ່າເຕືອນໄປແລ້ວ ----------
-- ບໍ່ມີຕາຕະລາງນີ້ ວຽກຕາມຕາຕະລາງທີ່ແລ່ນທຸກມື້ຈະສົ່ງ LINE ຊໍ້າທຸກມື້
create table if not exists it.subscription_reminders (
  subscription_id bigint not null references it.subscriptions(id) on delete cascade,
  due_date        date not null,
  days_before     integer not null,
  sent_at         timestamptz not null default now(),
  primary key (subscription_id, due_date, days_before)
);

-- ---------- ມຸມມອງທີ່ໜ້າຈໍໃຊ້ ----------
-- ຄິດຄ່າຕໍ່ເດືອນ ແລະ ສະຖານະກຳນົດຈ່າຍໄວ້ໃນ view ບ່ອນດຽວ
-- ບໍ່ໃຫ້ແຕ່ລະໜ້າຄິດເອງ ແລ້ວໄດ້ຄ່າບໍ່ຄືກັນ
create or replace view it.v_subscriptions as
select s.id,
       s.code,
       s.category,
       s.service_name,
       s.vendor,
       s.plan_name,
       s.account_ref,
       s.admin_url,
       s.billing_cycle,
       s.amount,
       s.currency,
       s.start_date,
       s.end_date,
       s.next_due_date,
       s.auto_renew,
       s.owner_employee_id,
       owner.fullname_lo                                as owner_name,
       owner.nickname                                   as owner_nickname,
       s.department_code,
       dep.name_1                                       as department_name,
       s.status,
       s.cancelled_at,
       s.cancel_reason,
       s.note,
       s.created_by,
       creator.fullname_lo                              as created_by_name,
       s.created_at,
       s.updated_at,
       case s.billing_cycle
         when 'monthly'   then s.amount
         when 'quarterly' then round(s.amount / 3, 2)
         when 'yearly'    then round(s.amount / 12, 2)
         else 0::numeric
       end                                              as monthly_amount,
       case s.billing_cycle
         when 'monthly'   then s.amount * 12
         when 'quarterly' then s.amount * 4
         when 'yearly'    then s.amount
         else 0::numeric
       end                                              as yearly_amount,
       case when s.next_due_date is null then null
            else s.next_due_date - current_date end     as days_to_due,
       -- ສະຖານະນີ້ໃຊ້ທັງສີປ້າຍ, ຕົວກັ່ນຕອງ, ຕົວເລກຂ້າງເມນູ ແລະ ການແຈ້ງເຕືອນ
       case
         when s.status <> 'active'                  then 'inactive'
         when s.next_due_date is null               then 'unknown'
         when s.next_due_date < current_date        then 'overdue'
         when s.next_due_date <= current_date + 30  then 'due_soon'
         else 'ok'
       end                                              as due_status,
       coalesce(p.period_count, 0)                      as period_count,
       coalesce(p.unpaid_count, 0)                      as unpaid_count,
       coalesce(p.paid_total, 0)                        as paid_total,
       p.last_paid_at
  from it.subscriptions s
  left join public.odg_employee owner   on owner.employee_id   = s.owner_employee_id
  left join public.odg_employee creator on creator.employee_id = s.created_by
  left join public.erp_department_list dep on dep.code::text = s.department_code::text
  left join (
    select subscription_id,
           count(*)                                               as period_count,
           count(*) filter (where status = 'unpaid')              as unpaid_count,
           coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_total,
           max(paid_at) filter (where status = 'paid')            as last_paid_at
      from it.subscription_periods
     group by subscription_id
  ) p on p.subscription_id = s.id;

create or replace view it.v_subscription_periods as
select p.id,
       p.subscription_id,
       s.code                                   as subscription_code,
       s.service_name,
       s.category,
       s.vendor,
       s.department_code,
       p.period_start,
       p.period_end,
       p.due_date,
       p.amount,
       p.currency,
       p.status,
       p.paid_at,
       p.invoice_no,
       p.note,
       p.created_by,
       e.fullname_lo                            as created_by_name,
       p.created_at,
       p.status = 'unpaid' and p.due_date < current_date as is_overdue
  from it.subscription_periods p
  join it.subscriptions s on s.id = p.subscription_id
  left join public.odg_employee e on e.employee_id = p.created_by;
