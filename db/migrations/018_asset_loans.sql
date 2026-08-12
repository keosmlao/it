-- 018_asset_loans.sql
-- ບັນທຶກການຢືມ / ຄືນອຸປະກອນຈາກລະບົບນີ້
--
-- ໃບຢືມ–ຄືນຂອງ ERP (asset_trans) ເປັນຂອງລະບົບອື່ນ ຈຶ່ງ**ບໍ່ຂຽນທັບ** —
-- ບັນທຶກຂອງພະແນກ IT ເກັບໄວ້ it.asset_loans ແລ້ວ union ເຂົ້າກັບຂອງ ERP
-- ໃນ view ດຽວກັນ ຜູ້ໃຊ້ຈຶ່ງເຫັນປະຫວັດຕໍ່ເນື່ອງເປັນເສັ້ນດຽວ.

create table it.loan_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create function it.next_loan_no(prefix varchar) returns varchar
language plpgsql as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.loan_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.loan_counters.last_no + 1
  returning last_no into n;

  return prefix || y::text || lpad(n::text, 4, '0');
end $$;

create table it.asset_loans (
  id             bigserial primary key,
  borrow_doc_no  varchar(30) not null unique default it.next_loan_no('BRIT'),
  asset_code     varchar(40) not null,
  emp_code       varchar(20) not null,
  borrowed_at    date        not null default current_date,
  expected_return date,
  borrow_note    text,

  return_doc_no  varchar(30) unique,
  returned_at    date,
  return_note    text,
  return_condition varchar(20)
                 check (return_condition in ('good', 'damaged', 'lost')),

  created_by     integer not null,
  returned_by    integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index asset_loans_asset_idx
  on it.asset_loans (asset_code, borrowed_at desc)
  where deleted_at is null;

create index asset_loans_open_idx
  on it.asset_loans (asset_code)
  where deleted_at is null and returned_at is null;

-- ຕ້ອງລຶບຕາມລຳດັບການອ້າງອີງ: assets → holders → movements
drop view it.v_it_assets;
drop view it.v_asset_holders;
drop view it.v_asset_movements;

-- ປະຫວັດຢືມ–ຄືນ = ຂອງ ERP + ຂອງລະບົບນີ້
create view it.v_asset_movements as
select 'erp'::varchar             as source,
       r.item_code                as asset_code,
       r.item_name                as asset_name,
       r.emp_code,
       r.emp_name,
       r.department_code,
       r.department_name,
       nullif(dv.division_code, '')                     as division_code,
       dv.division_name_lo                              as division_name,
       nullif(e.department_code, '')                    as hr_department_code,
       hrd.department_name_lo                           as hr_department_name,
       nullif(e.unit_code, '')                          as unit_code,
       u.unit_name_lo                                   as unit_name,
       coalesce(hrd.department_name_lo, r.department_name) as org_department,
       e.employee_id is null
         or e.employment_status <> 'ACTIVE'             as is_former_employee,
       e.employment_status,
       r.borrow_doc_no,
       r.from_date                as borrowed_at,
       null::date                 as expected_return,
       r.return_doc_no,
       r.to_date                  as returned_at,
       null::varchar              as return_condition,
       null::text                 as note,
       r.category_name,
       nullif(r.as_brand, '')     as brand,
       nullif(r.as_model_info, '') as model,
       nullif(r.as_sn, '')        as serial_no,
       r.return_doc_no is not null as is_returned
  from public.report_asset_trans_detail r
  left join public.odg_employee e     on e.employee_code     = r.emp_code
  left join public.odg_department hrd on hrd.department_code = e.department_code
  left join public.odg_division dv    on dv.division_code    = hrd.division_code
  left join public.odg_unit u         on u.unit_code         = e.unit_code
 where r.item_code like '200-%'

union all

select 'it'::varchar,
       l.asset_code,
       a.name_1,
       l.emp_code,
       e.fullname_lo,
       nullif(e.department_code, ''),
       hrd.department_name_lo,
       nullif(dv.division_code, ''),
       dv.division_name_lo,
       nullif(e.department_code, ''),
       hrd.department_name_lo,
       nullif(e.unit_code, ''),
       u.unit_name_lo,
       hrd.department_name_lo,
       e.employee_id is null or e.employment_status <> 'ACTIVE',
       e.employment_status,
       l.borrow_doc_no,
       l.borrowed_at::timestamp,
       l.expected_return,
       l.return_doc_no,
       l.returned_at::timestamp,
       l.return_condition,
       coalesce(l.return_note, l.borrow_note),
       cat.name_1,
       nullif(a.as_brand, ''),
       nullif(a.as_model_info, ''),
       nullif(a.as_sn, ''),
       l.returned_at is not null
  from it.asset_loans l
  left join public.as_asset a         on a.code              = l.asset_code
  left join public.odg_it_category cat on cat.code           = a.as_category
  left join public.odg_employee e     on e.employee_code     = l.emp_code
  left join public.odg_department hrd on hrd.department_code = e.department_code
  left join public.odg_division dv    on dv.division_code    = hrd.division_code
  left join public.odg_unit u         on u.unit_code         = e.unit_code
 where l.deleted_at is null;

-- ຜູ້ຖືຄອງປັດຈຸບັນ = ໃບຢືມຫຼ້າສຸດທີ່ຍັງບໍ່ຄືນ (ນັບທັງ ERP ແລະ IT)
create view it.v_asset_holders as
select distinct on (asset_code)
       asset_code                as item_code,
       emp_code,
       emp_name,
       hr_department_code        as department_code,
       org_department            as department_name,
       borrow_doc_no,
       borrowed_at               as from_date,
       source                    as holder_source
  from it.v_asset_movements
 where not is_returned
 order by asset_code, borrowed_at desc nulls last, borrow_doc_no desc nulls last;

create view it.v_it_assets as
select a.code                                   as asset_code,
       a.name_1                                 as name,
       a.as_type                                as type_code,
       t.name_1                                 as type_name,
       a.as_type <> '200'                       as type_mismatch,
       a.as_category                            as category_code,
       coalesce(
         cat.name_1,
         case
           when a.name_1 ~* '(notebook|laptop|macbook)'       then 'NOTEBOOK'
           when a.name_1 ~* '(all in one|all-in-one|desktop|\mpc\M)' then 'DESKTOP'
           when a.name_1 ~* '(monitor|\mled\M|display)'        then 'MONITOR'
           when a.name_1 ~* '(printer|ເຄື່ອງພິມ)'               then 'PRINTER'
           when a.name_1 ~* 'scanner'                          then 'SCANNER'
           when a.name_1 ~* '(switch|router|access point|firewall|wifi)' then 'NETWORK'
           when a.name_1 ~* 'server'                           then 'SERVER'
           when a.name_1 ~* '(tablet|ipad)'                    then 'TABLET'
           when a.name_1 ~* '(smartphone|phone|iphone)'        then 'SMARTPHONE'
           when a.name_1 ~* '\mups\M'                          then 'UPS'
           when a.name_1 ~* '(camera|cctv)'                    then 'CCTV'
           when a.name_1 ~* 'projector'                        then 'PROJECTOR'
           else 'ອື່ນໆ'
         end
       )                                        as category_name,
       cat.name_1 is null                       as category_guessed,
       nullif(a.as_brand, '')                   as brand,
       nullif(a.as_model_info, '')              as model,
       nullif(a.as_sn, '')                      as serial_no,
       nullif(a.mac_address, '')                as mac_address,
       nullif(a.as_location, '')                as location_code,
       loc.name_1                               as location_name,
       nullif(a.department_code, '')            as department_code,
       dep.name_1                               as department_name,
       a.department_code = '8001'               as owned_by_it,
       a.create_date_time_now                   as registered_at,

       s.cpu, s.ram, s.storage, s.gpu, s.os, s.screen, s.spec_note,
       s.asset_code is not null                 as has_spec,

       coalesce(s.purchase_date, d.as_buy_date,
                a.create_date_time_now::date)   as purchase_date,
       case
         when s.purchase_date is not null then 'it'
         when d.as_buy_date  is not null then 'erp'
         when a.create_date_time_now is not null then 'registered'
         else 'unknown'
       end                                      as purchase_date_source,
       coalesce(s.purchase_price, nullif(d.as_buy_price, 0)) as purchase_price,
       coalesce(
         nullif(d.as_buy_year, 0),
         extract(year from coalesce(s.purchase_date, d.as_buy_date,
                                    a.create_date_time_now))::int
       )                                        as buy_year,

       coalesce(
         s.warranty_until, d.insure_stop_date,
         (coalesce(s.purchase_date, d.as_buy_date,
                   a.create_date_time_now::date) + interval '12 months')::date
       )                                        as warranty_until,
       case
         when s.warranty_until is not null then 'it'
         when d.insure_stop_date is not null then 'erp'
         else 'auto'
       end                                      as warranty_source,
       s.warranty_note,
       case
         when coalesce(s.warranty_until, d.insure_stop_date,
                (coalesce(s.purchase_date, d.as_buy_date,
                          a.create_date_time_now::date)
                 + interval '12 months')::date) < current_date then 'expired'
         when coalesce(s.warranty_until, d.insure_stop_date,
                (coalesce(s.purchase_date, d.as_buy_date,
                          a.create_date_time_now::date)
                 + interval '12 months')::date) < current_date + 60 then 'expiring'
         else 'valid'
       end                                      as warranty_status,

       h.emp_code                               as holder_code,
       h.emp_name                               as holder_name,
       h.department_name                        as holder_department,
       h.borrow_doc_no,
       h.from_date                              as borrowed_at,
       h.holder_source,
       h.item_code is not null                  as is_assigned,
       coalesce(mv.total, 0)                    as movement_count,
       coalesce(rp.total, 0)                    as repair_count
  from public.as_asset a
  left join public.as_asset_detail d     on d.as_code   = a.code
  left join public.as_asset_type t       on t.code      = a.as_type
  left join public.as_asset_location loc on loc.code    = a.as_location
  left join public.odg_it_category cat   on cat.code    = a.as_category
  left join public.erp_department_list dep on dep.code  = a.department_code
  left join it.v_asset_holders h         on h.item_code = a.code
  left join it.asset_specs s             on s.asset_code = a.code
  left join (
        select asset_code, count(*) as total
          from it.v_asset_movements
         group by asset_code
       ) mv on mv.asset_code = a.code
  left join (
        select asset_code, count(*) as total
          from it.v_asset_repairs
         group by asset_code
       ) rp on rp.asset_code = a.code
 where a.code like '200-%';
