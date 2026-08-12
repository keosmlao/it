-- 001_init.sql
-- ພື້ນຖານຂອງລະບົບບໍລິຫານພະແນກໄອທີ (schema `it`)
-- ຂໍ້ມູນພະນັກງານ/ພະແນກ/ຕຳແໜ່ງ ໃຊ້ຂອງ public ທີ່ມີຢູ່ແລ້ວ — ບໍ່ສ້າງຊ້ຳ ແລະ ບໍ່ແກ້ໄຂ.

create schema if not exists it;

-- ຍົກເວັ້ນ role ສະເພາະບຸກຄົນ (override ຜົນທີ່ຄິດຈາກຕຳແໜ່ງ/ໜ່ວຍງານ)
create table if not exists it.user_role_override (
  employee_id integer primary key,
  role        varchar(20) not null
              check (role in ('manager','head','developer','support','staff')),
  note        text,
  created_at  timestamptz not null default now(),
  created_by  integer
);

-- ພະນັກງານພະແນກໄອທີ (801) ພ້ອມ role ທີ່ຄິດອັດຕະໂນມັດ
create or replace view it.v_it_staff as
select e.employee_id,
       e.employee_code,
       e.fullname_lo,
       e.nickname,
       e.unit_code,
       u.unit_name_lo,
       e.position_code,
       p.position_name_lo,
       coalesce(
         o.role,
         case
           when p.is_manager                then 'manager'
           when e.position_code = '12'      then 'head'
           when e.unit_code     = '8011'    then 'developer'
           when e.unit_code     = '8010'    then 'support'
           else 'staff'
         end
       ) as role
  from public.odg_employee e
  join public.odg_position p on p.position_code = e.position_code
  left join public.odg_unit u on u.unit_code = e.unit_code
  left join it.user_role_override o on o.employee_id = e.employee_id
 where e.department_code   = '801'
   and e.employment_status = 'ACTIVE';

-- session ຂອງລະບົບນີ້ (ເກັບແຍກ ບໍ່ແຕະ auth ຂອງແອັບອື່ນ)
create table if not exists it.sessions (
  token       varchar(64) primary key,
  employee_id integer     not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  user_agent  text,
  revoked_at  timestamptz
);

create index if not exists sessions_employee_idx
  on it.sessions (employee_id)
  where revoked_at is null;

-- ບັນທຶກການເຂົ້າໃຊ້ (ສຳເລັດ ແລະ ລົ້ມເຫຼວ) ສຳລັບກວດສອບຄວາມປອດໄພ
create table if not exists it.login_attempts (
  id            bigserial primary key,
  employee_code varchar(20),
  succeeded     boolean     not null,
  reason        varchar(50),
  ip            varchar(64),
  attempted_at  timestamptz not null default now()
);

create index if not exists login_attempts_code_time_idx
  on it.login_attempts (employee_code, attempted_at desc);
