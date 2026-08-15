-- 044_accounts_onboarding.sql
-- ທະບຽນບັນຊີຜູ້ໃຊ້ໃນລະບົບຕ່າງໆ + ຂັ້ນຕອນຮັບພະນັກງານເຂົ້າ / ອອກ
--
-- ເຫດຜົນ: ລະບົບຮູ້ແລ້ວວ່າ "ໃຜຖືເຄື່ອງຫຍັງ" (it.v_asset_holders) ແຕ່ບໍ່ຮູ້ວ່າ
-- "ໃຜມີບັນຊີຫຍັງ" — email, ERP, VPN, Wi-Fi, Google Workspace…
-- ພະນັກງານອອກໄປແລ້ວບັນຊີຍັງເປີດຢູ່ = ຮູຮົ່ວຄວາມປອດໄພ **ແລະ** ຍັງເສຍຄ່າ
-- seat ຢູ່ທຸກເດືອນ. ຜູກກັບ it.subscriptions ຈຶ່ງທຽບໄດ້ວ່າຈ່າຍໄປຈັກບ່ອນນັ່ງ
-- ແລະ ໃຊ້ຈິງຈັກຄົນ
--
-- ໜ້າຈໍຄິດ "ຄວນປິດ" ຈາກ employment_status ຂອງ HR ໂດຍກົງ ຈຶ່ງບໍ່ຕ້ອງລໍໃຫ້
-- ໃຜມາໝາຍເອງ — ຫຼັກການດຽວກັບ it.v_recovery_targets ຂອງອຸປະກອນ

-- ---------- ລະບົບທີ່ມີບັນຊີ ----------
create table if not exists it.account_systems (
  code            varchar(20) primary key,
  name            varchar(120) not null,
  kind            varchar(20) not null default 'app'
                  check (kind in ('email','erp','vpn','wifi','app','server','other')),
  -- ຜູກກັບສັນຍາເຊົ່າ ຖ້າລະບົບນີ້ຈ່າຍເປັນ seat
  subscription_id bigint references it.subscriptions(id) on delete set null,
  seat_limit      integer check (seat_limit is null or seat_limit >= 0),
  owner_employee_id integer,
  note            varchar(300),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------- ບັນຊີລາຍຄົນ ----------
create table if not exists it.system_accounts (
  id          bigserial primary key,
  system_code varchar(20) not null references it.account_systems(code) on delete cascade,
  employee_id integer not null,
  username    varchar(150) not null,
  status      varchar(10) not null default 'active'
              check (status in ('active','suspended','closed')),
  granted_at  date not null default current_date,
  closed_at   date,
  note        varchar(300),
  created_by  integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ຄົນດຽວມີບັນຊີທີ່ຍັງເປີດຢູ່ໃນລະບົບໜຶ່ງໄດ້ອັນດຽວ — ບັນຊີທີ່ປິດແລ້ວຊໍ້າໄດ້
-- ເພາະຄົນເກົ່າອາດກັບມາເຮັດວຽກໃໝ່
create unique index if not exists system_accounts_open_idx
  on it.system_accounts (system_code, employee_id)
  where status <> 'closed';
create index if not exists system_accounts_emp_idx
  on it.system_accounts (employee_id, status);

-- ---------- ແມ່ແບບຂັ້ນຕອນ ----------
create table if not exists it.checklist_templates (
  id         bigserial primary key,
  kind       varchar(10) not null check (kind in ('onboard','offboard')),
  sort_order integer not null default 0,
  title      varchar(200) not null,
  hint       varchar(300),
  is_active  boolean not null default true
);

create table if not exists it.employee_checklists (
  id           bigserial primary key,
  employee_id  integer not null,
  kind         varchar(10) not null check (kind in ('onboard','offboard')),
  status       varchar(10) not null default 'open'
               check (status in ('open','done','cancelled')),
  started_at   date not null default current_date,
  target_date  date,
  completed_at date,
  note         text,
  created_by   integer not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists employee_checklists_open_idx
  on it.employee_checklists (status, kind, started_at desc);

create table if not exists it.checklist_items (
  id           bigserial primary key,
  checklist_id bigint not null references it.employee_checklists(id) on delete cascade,
  sort_order   integer not null default 0,
  title        varchar(200) not null,
  hint         varchar(300),
  is_done      boolean not null default false,
  done_by      integer,
  done_at      timestamptz,
  note         varchar(300)
);

create index if not exists checklist_items_list_idx
  on it.checklist_items (checklist_id, sort_order);

-- ---------- ຂັ້ນຕອນມາດຕະຖານ (ແກ້ໄດ້ພາຍຫຼັງຢູ່ຖານຂໍ້ມູນ) ----------
insert into it.checklist_templates (kind, sort_order, title, hint)
select * from (values
  ('onboard',  10, 'ສ້າງບັນຊີອີເມວ',                 'ແລ້ວລົງທະບຽນໄວ້ໃນທະບຽນບັນຊີຜູ້ໃຊ້'),
  ('onboard',  20, 'ສ້າງບັນຊີເຂົ້າລະບົບ ERP',         'ກຳນົດສິດຕາມຕຳແໜ່ງ'),
  ('onboard',  30, 'ມອບເຄື່ອງຄອມພິວເຕີ / ອຸປະກອນ',    'ອອກໃບຢືມໃນລະບົບ'),
  ('onboard',  40, 'ຕັ້ງຄ່າ Wi-Fi ແລະ ເຄື່ອງພິມ',      null),
  ('onboard',  50, 'ຕິດຕັ້ງໂປຣແກຣມທີ່ຈຳເປັນ',          'Office, antivirus, ໂປຣແກຣມສະເພາະງານ'),
  ('onboard',  60, 'ແນະນຳວິທີແຈ້ງບັນຫາ (ticket)',      'ສົ່ງລິ້ງລະບົບ ແລະ ຄັງຄວາມຮູ້ໃຫ້'),
  ('onboard',  70, 'ຜູກ LINE ຮັບການແຈ້ງເຕືອນ',         null),
  ('offboard', 10, 'ປິດບັນຊີອີເມວ ຫຼື ໂອນຕໍ່',          'ຢ່າລຶບທັນທີ — ໂອນຂໍ້ມູນໃຫ້ຫົວໜ້າກ່ອນ'),
  ('offboard', 20, 'ປິດບັນຊີ ERP ແລະ ລະບົບພາຍໃນ',      'ກວດທະບຽນບັນຊີຜູ້ໃຊ້ໃຫ້ຄົບທຸກລະບົບ'),
  ('offboard', 30, 'ຮັບຄືນອຸປະກອນທັງໝົດ',              'ບັນທຶກການຄືນໃນລະບົບ'),
  ('offboard', 40, 'ຖອນສິດເຂົ້າ VPN / Wi-Fi',          null),
  ('offboard', 50, 'ສຳຮອງຂໍ້ມູນໃນເຄື່ອງ ແລ້ວລ້າງເຄື່ອງ', 'ສົ່ງໄຟລ໌ວຽກໃຫ້ຫົວໜ້າໜ່ວຍງານ'),
  ('offboard', 60, 'ຖອນສິດເຂົ້າລະບົບນີ້',              'ຢູ່ໜ້າຕັ້ງຄ່າລະບົບ'),
  ('offboard', 70, 'ຫຼຸດ seat ຂອງບໍລິການທີ່ຈ່າຍລາຍຫົວ', 'ຈະໄດ້ບໍ່ຈ່າຍລົມທຸກເດືອນ')
) as t(kind, sort_order, title, hint)
where not exists (select 1 from it.checklist_templates);

-- ---------- ມຸມມອງ ----------
create or replace view it.v_account_systems as
select s.code,
       s.name,
       s.kind,
       s.subscription_id,
       sub.service_name                        as subscription_name,
       sub.amount                              as subscription_amount,
       sub.currency                            as subscription_currency,
       sub.billing_cycle,
       s.seat_limit,
       s.owner_employee_id,
       owner.fullname_lo                       as owner_name,
       s.note,
       s.is_active,
       s.created_at,
       coalesce(a.active_count, 0)             as active_count,
       coalesce(a.closable_count, 0)           as closable_count,
       case when s.seat_limit is null then null
            else s.seat_limit - coalesce(a.active_count, 0) end as seats_free
  from it.account_systems s
  left join it.subscriptions sub on sub.id = s.subscription_id
  left join public.odg_employee owner on owner.employee_id = s.owner_employee_id
  left join (
    select sa.system_code,
           count(*) filter (where sa.status = 'active')  as active_count,
           count(*) filter (where sa.status <> 'closed'
                              and coalesce(e.employment_status, 'GONE') <> 'ACTIVE')
                                                          as closable_count
      from it.system_accounts sa
      left join public.odg_employee e on e.employee_id = sa.employee_id
     group by sa.system_code
  ) a on a.system_code::text = s.code::text;

create or replace view it.v_system_accounts as
select sa.id,
       sa.system_code,
       sys.name                                     as system_name,
       sys.kind,
       sa.employee_id,
       e.employee_code,
       e.fullname_lo                                as employee_name,
       e.department_code,
       dep.department_name_lo                       as department_name,
       e.employment_status,
       sa.username,
       sa.status,
       sa.granted_at,
       sa.closed_at,
       sa.note,
       sa.created_by,
       sa.created_at,
       -- ຄິດຈາກ HR ໂດຍກົງ: ຍັງບໍ່ປິດ ແຕ່ຄົນນີ້ບໍ່ໄດ້ເຮັດວຽກຢູ່ແລ້ວ
       sa.status <> 'closed'
         and coalesce(e.employment_status, 'GONE') <> 'ACTIVE'  as should_close,
       case
         when e.employee_id is null            then 'not_in_hr'
         when e.employment_status <> 'ACTIVE'  then 'resigned'
         else 'active'
       end                                          as hr_state
  from it.system_accounts sa
  join it.account_systems sys on sys.code::text = sa.system_code::text
  left join public.odg_employee e on e.employee_id = sa.employee_id
  left join public.odg_department dep on dep.department_code::text = e.department_code::text;

create or replace view it.v_employee_checklists as
select c.id,
       c.employee_id,
       e.employee_code,
       e.fullname_lo                          as employee_name,
       e.department_code,
       dep.department_name_lo                 as department_name,
       e.employment_status,
       c.kind,
       c.status,
       c.started_at,
       c.target_date,
       c.completed_at,
       c.note,
       c.created_by,
       creator.fullname_lo                    as created_by_name,
       c.created_at,
       c.updated_at,
       coalesce(i.total, 0)                   as item_count,
       coalesce(i.done, 0)                    as done_count,
       case when coalesce(i.total, 0) = 0 then 0
            else round(coalesce(i.done, 0) * 100.0 / i.total)::integer
       end                                    as percent_done,
       case when c.target_date is not null and c.status = 'open'
                 and c.target_date < current_date
            then true else false end          as is_late
  from it.employee_checklists c
  left join public.odg_employee e on e.employee_id = c.employee_id
  left join public.odg_department dep on dep.department_code::text = e.department_code::text
  left join public.odg_employee creator on creator.employee_id = c.created_by
  left join (select checklist_id, count(*) as total,
                    count(*) filter (where is_done) as done
               from it.checklist_items group by checklist_id) i
         on i.checklist_id = c.id;
