-- 012_asset_specs_repairs.sql
-- Spec ເຄື່ອງ · ວັນທີຊື້ · ສະຖານະປະກັນ · ປະຫວັດການສ້ອມ
--
-- ເຫດຜົນ: ທະບຽນ ERP ບໍ່ມີຊ່ອງ spec ເລີຍ ແລະ ຂໍ້ມູນການຊື້/ປະກັນເກືອບຫວ່າງ
-- (369 ເຄື່ອງ: ມີວັນທີຊື້ພຽງ 3, ມີປະກັນພຽງ 3) ຈຶ່ງໃຫ້ພະແນກ IT ຕື່ມເອງໄດ້
-- ໂດຍເກັບໄວ້ schema `it` ແລ້ວທັບຄ່າຂອງ ERP ເມື່ອມີ.

create table it.asset_specs (
  asset_code     varchar(40) primary key,
  cpu            varchar(120),
  ram            varchar(60),
  storage        varchar(120),
  gpu            varchar(120),
  os             varchar(80),
  screen         varchar(60),
  spec_note      text,

  -- ຕື່ມແທນ/ທັບຂໍ້ມູນ ERP ທີ່ຫວ່າງ
  purchase_date  date,
  purchase_price numeric(14,2),
  warranty_until date,
  warranty_note  varchar(200),

  updated_by     integer not null,
  updated_at     timestamptz not null default now()
);

-- ການສ້ອມທີ່ພະແນກ IT ບັນທຶກເອງ (ຜູກກັບ ticket ໄດ້)
create table it.asset_repairs (
  id           bigserial primary key,
  asset_code   varchar(40) not null,
  repair_date  date not null default current_date,
  issue        text not null,
  action       text,
  cost         numeric(14,2),
  vendor       varchar(120),
  status       varchar(20) not null default 'done'
               check (status in ('sent', 'done', 'cancelled')),
  ticket_id    bigint references it.tickets(id) on delete set null,
  created_by   integer not null,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index asset_repairs_asset_idx
  on it.asset_repairs (asset_code, repair_date desc)
  where deleted_at is null;

-- ປະຫວັດການສ້ອມລວມ: ຂອງ ERP + ຂອງ IT
create view it.v_asset_repairs as
select 'erp'::varchar                    as source,
       d.doc_no                          as ref_no,
       d.as_code                         as asset_code,
       d.maintain_date::date             as repair_date,
       coalesce(nullif(d.remark, ''), d.maintain_name, 'ສ້ອມແປງ') as issue,
       nullif(d.maintain_name, '')       as action,
       nullif(d.maintain_price, 0)       as cost,
       nullif(d.maintain_location, '')   as vendor,
       'done'::varchar                   as status,
       null::bigint                      as ticket_id,
       null::varchar                     as created_by_name,
       d.create_date_time_now            as created_at
  from public.as_asset_maintenance_detail d
 where d.as_code is not null

union all

select 'it'::varchar,
       'IT-' || r.id::text,
       r.asset_code,
       r.repair_date,
       r.issue,
       r.action,
       r.cost,
       r.vendor,
       r.status,
       r.ticket_id,
       e.fullname_lo,
       r.created_at
  from it.asset_repairs r
  join public.odg_employee e on e.employee_id = r.created_by
 where r.deleted_at is null;

-- ເພີ່ມ spec, ວັນທີຊື້, ສະຖານະປະກັນ ແລະ ຈຳນວນຄັ້ງທີ່ສ້ອມ ເຂົ້າ view ຫຼັກ
drop view it.v_it_assets;

create view it.v_it_assets as
select a.code                                   as asset_code,
       a.name_1                                 as name,
       a.as_type                                as type_code,
       t.name_1                                 as type_name,
       a.as_category                            as category_code,
       coalesce(
         cat.name_1,
         case
           when a.name_1 ~* '(notebook|laptop|macbook)'       then 'NOTEBOOK'
           when a.name_1 ~* '(all in one|desktop|\mpc\M)'      then 'DESKTOP'
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

       -- spec ທີ່ພະແນກ IT ປ້ອນ
       s.cpu, s.ram, s.storage, s.gpu, s.os, s.screen, s.spec_note,
       s.asset_code is not null                 as has_spec,

       -- ວັນທີຊື້ ແລະ ລາຄາ: ໃຊ້ຂອງ IT ກ່ອນ ຖ້າບໍ່ມີຈຶ່ງໃຊ້ຂອງ ERP
       coalesce(s.purchase_date, d.as_buy_date) as purchase_date,
       coalesce(s.purchase_price, nullif(d.as_buy_price, 0)) as purchase_price,
       nullif(d.as_buy_year, 0)                 as buy_year,

       -- ປະກັນ
       coalesce(s.warranty_until, d.insure_stop_date) as warranty_until,
       s.warranty_note,
       case
         when coalesce(s.warranty_until, d.insure_stop_date) is null then 'unknown'
         when coalesce(s.warranty_until, d.insure_stop_date) < current_date then 'expired'
         when coalesce(s.warranty_until, d.insure_stop_date) < current_date + 60 then 'expiring'
         else 'valid'
       end                                      as warranty_status,

       h.emp_code                               as holder_code,
       h.emp_name                               as holder_name,
       h.department_name                        as holder_department,
       h.borrow_doc_no,
       h.from_date                              as borrowed_at,
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
        select item_code, count(*) as total
          from public.report_asset_trans_detail
         group by item_code
       ) mv on mv.item_code = a.code
  left join (
        select asset_code, count(*) as total
          from it.v_asset_repairs
         group by asset_code
       ) rp on rp.asset_code = a.code
 where a.as_type = '200';
