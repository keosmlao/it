-- 045_consumables.sql
-- ອຸປະກອນສິ້ນເປືອງ — ໝຶກພິມ, ສາຍ LAN, ຫົວ RJ45, ແບັດ, ເມົ້າ, ແປ້ນພິມ…
--
-- ເຫດຜົນ: ຂອງພວກນີ້ບໍ່ມີ serial ແລະ ບໍ່ໄດ້ຢືມ–ຄືນ ຈຶ່ງລົງໃນທະບຽນຊັບສິນບໍ່ໄດ້
-- ແຕ່ຕ້ອງຮູ້ວ່າ "ຍັງເຫຼືອເທົ່າໃດ" ແລະ "ໃຜເບີກໄປ" ບໍ່ດັ່ງນັ້ນຮອດເວລາຈຳເປັນ
-- ຈຶ່ງມາຮູ້ວ່າໝົດ
--
-- ຍອດຄົງເຫຼືອບໍ່ໄດ້ເກັບເປັນຄໍລຳ ແຕ່ບວກຈາກການເຄື່ອນໄຫວ (ledger) —
-- ຖ້າເກັບເປັນຄໍລຳ ມັນຈະຄາດເຄື່ອນທັນທີທີ່ມີການແກ້ຍ້ອນຫຼັງ ແລະ ຫາສາເຫດບໍ່ໄດ້

create table if not exists it.consumable_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create or replace function it.next_consumable_code() returns varchar
language plpgsql as $fn$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.consumable_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.consumable_counters.last_no + 1
  returning last_no into n;

  return 'CS-' || y::text || lpad(n::text, 4, '0');
end $fn$;

create table if not exists it.consumables (
  id            bigserial primary key,
  code          varchar(20) not null unique default it.next_consumable_code(),
  name          varchar(150) not null,
  category      varchar(20) not null default 'other'
                check (category in ('ink','cable','part','battery','peripheral',
                                    'media','other')),
  unit          varchar(20) not null default 'ອັນ',
  -- ຕ່ຳກວ່ານີ້ຄືສັນຍານໃຫ້ສັ່ງຊື້ — ຂຶ້ນເປັນຕົວເລກສີແດງຂ້າງເມນູ
  min_qty       numeric(12,2) not null default 0 check (min_qty >= 0),
  location      varchar(120),
  vendor_id     bigint references it.vendors(id) on delete set null,
  unit_price    numeric(14,2),
  note          varchar(300),
  is_active     boolean not null default true,
  created_by    integer not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists consumables_name_idx on it.consumables (lower(name));

create table if not exists it.consumable_moves (
  id              bigserial primary key,
  consumable_id   bigint not null references it.consumables(id) on delete cascade,
  -- in = ຮັບເຂົ້າ · out = ເບີກອອກ · adjust = ປັບຍອດຫຼັງນັບຈິງ (ບວກ ຫຼື ລົບ)
  kind            varchar(6) not null check (kind in ('in','out','adjust')),
  qty             numeric(12,2) not null check (qty <> 0),
  moved_at        date not null default current_date,
  employee_id     integer,
  department_code varchar(20),
  asset_code      varchar(40),
  ref_no          varchar(60),
  note            varchar(300),
  created_by      integer not null,
  created_at      timestamptz not null default now()
);

create index if not exists consumable_moves_item_idx
  on it.consumable_moves (consumable_id, moved_at desc);

create or replace view it.v_consumables as
select c.id,
       c.code,
       c.name,
       c.category,
       c.unit,
       c.min_qty,
       c.location,
       c.vendor_id,
       v.name                                   as vendor_name,
       c.unit_price,
       c.note,
       c.is_active,
       c.created_by,
       c.created_at,
       c.updated_at,
       coalesce(m.on_hand, 0)                   as on_hand,
       coalesce(m.in_qty, 0)                    as in_qty,
       coalesce(m.out_qty, 0)                   as out_qty,
       m.last_move_at,
       coalesce(m.on_hand, 0) * coalesce(c.unit_price, 0) as stock_value,
       case
         when not c.is_active                       then 'inactive'
         when coalesce(m.on_hand, 0) <= 0           then 'empty'
         when coalesce(m.on_hand, 0) <= c.min_qty   then 'low'
         else 'ok'
       end                                      as stock_state
  from it.consumables c
  left join it.vendors v on v.id = c.vendor_id
  left join (
    select consumable_id,
           sum(case kind when 'out' then -qty else qty end) as on_hand,
           sum(qty) filter (where kind = 'in')              as in_qty,
           sum(qty) filter (where kind = 'out')             as out_qty,
           max(moved_at)                                    as last_move_at
      from it.consumable_moves
     group by consumable_id
  ) m on m.consumable_id = c.id;

create or replace view it.v_consumable_moves as
select mv.id,
       mv.consumable_id,
       c.code                       as consumable_code,
       c.name                       as consumable_name,
       c.unit,
       mv.kind,
       mv.qty,
       mv.moved_at,
       mv.employee_id,
       e.fullname_lo                as employee_name,
       mv.department_code,
       dep.name_1                   as department_name,
       mv.asset_code,
       mv.ref_no,
       mv.note,
       mv.created_by,
       creator.fullname_lo          as created_by_name,
       mv.created_at
  from it.consumable_moves mv
  join it.consumables c on c.id = mv.consumable_id
  left join public.odg_employee e on e.employee_id = mv.employee_id
  left join public.odg_employee creator on creator.employee_id = mv.created_by
  left join public.erp_department_list dep on dep.code::text = mv.department_code::text;
