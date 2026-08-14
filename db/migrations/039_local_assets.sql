-- 039_local_assets.sql
-- ລົງທະບຽນຊັບສິນໃນລະບົບນີ້ໄດ້ ບໍ່ຕ້ອງລໍ ERP
--
-- ເຫດຜົນ: ທະບຽນອຸປະກອນທັງໝົດມາຈາກ ERP (`as_asset` ລະຫັດ 200-…) ຢ່າງດຽວ.
-- ອຸປະກອນທີ່ພະແນກ IT ໄດ້ມາເອງ (ຮັບບໍລິຈາກ, ຊື້ດ່ວນ, ຢືມມາທົດລອງ,
-- ອຸປະກອນນ້ອຍທີ່ ERP ບໍ່ຂຶ້ນທະບຽນ) ຈຶ່ງບໍ່ມີບ່ອນເກັບ ແລະ ຢືມ–ຄືນບໍ່ໄດ້.
--
-- ວິທີ: ຕາຕະລາງໃໝ່ `it.local_assets` ແລ້ວ union ເຂົ້າ `v_it_assets`
-- ດ້ວຍຄໍລຳຊຸດດຽວກັນ — ໜ້າຈໍ, ການຢືມ–ຄືນ, ລາຍງານ ໃຊ້ໄດ້ທັນທີບໍ່ຕ້ອງແກ້.
--
-- ລະຫັດໃຊ້ຄຳນຳໜ້າ 'ITA-' ຈຶ່ງບໍ່ມີວັນຊົນກັບ '200-' ຂອງ ERP

create table if not exists it.local_asset_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create or replace function it.next_local_asset_code() returns varchar
language plpgsql as $fn$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.local_asset_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.local_asset_counters.last_no + 1
  returning last_no into n;

  return 'ITA-' || y::text || lpad(n::text, 4, '0');
end $fn$;

create table if not exists it.local_assets (
  asset_code      varchar(25) primary key default it.next_local_asset_code(),
  name            varchar(100) not null,
  category_code   varchar(20),
  brand           varchar(120),
  model           varchar(120),
  serial_no       varchar(120),
  mac_address     varchar(60),
  location_code   varchar(20),
  department_code varchar(20),
  purchase_date   date,
  purchase_price  numeric(14,2),
  source_note     varchar(200),
  is_active       boolean not null default true,
  registered_by   integer not null,
  registered_at   timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- serial ຊໍ້າກັນບໍ່ໄດ້ ຖ້າມີການປ້ອນ — ກັນລົງທະບຽນເຄື່ອງດຽວກັນສອງເທື່ອ
create unique index if not exists local_assets_serial_idx
  on it.local_assets (upper(serial_no)) where serial_no is not null;

-- ---------- ຍ້າຍນິຍາມເກົ່າໄປໄວ້ຊື່ໃໝ່ ----------
-- ບໍ່ໄດ້ແກ້ເນື້ອໃນ ພຽງແຕ່ຕັ້ງຊື່ໃຫ້ສ່ວນ ERP ເພື່ອໃຫ້ union ອ່ານງ່າຍ
create or replace view it.v_erp_assets as
SELECT a.code AS asset_code,
    a.name_1 AS name,
    a.as_type AS type_code,
    t.name_1 AS type_name,
    a.as_type::text <> '200'::text AS type_mismatch,
    COALESCE(a.status::integer, 0) = 0 AS is_active,
    a.as_category AS category_code,
    COALESCE(cat.name_1,
        CASE
            WHEN a.name_1::text ~* '(notebook|laptop|macbook)'::text THEN 'NOTEBOOK'::text
            WHEN a.name_1::text ~* '(all in one|all-in-one|desktop|\mpc\M)'::text THEN 'DESKTOP'::text
            WHEN a.name_1::text ~* '(monitor|\mled\M|display)'::text THEN 'MONITOR'::text
            WHEN a.name_1::text ~* '(printer|ເຄື່ອງພິມ)'::text THEN 'PRINTER'::text
            WHEN a.name_1::text ~* 'scanner'::text THEN 'SCANNER'::text
            WHEN a.name_1::text ~* '(switch|router|access point|firewall|wifi)'::text THEN 'NETWORK'::text
            WHEN a.name_1::text ~* 'server'::text THEN 'SERVER'::text
            WHEN a.name_1::text ~* '(tablet|ipad)'::text THEN 'TABLET'::text
            WHEN a.name_1::text ~* '(smartphone|phone|iphone)'::text THEN 'SMARTPHONE'::text
            WHEN a.name_1::text ~* '\mups\M'::text THEN 'UPS'::text
            WHEN a.name_1::text ~* '(camera|cctv)'::text THEN 'CCTV'::text
            WHEN a.name_1::text ~* 'projector'::text THEN 'PROJECTOR'::text
            ELSE 'ອື່ນໆ'::text
        END::character varying) AS category_name,
    cat.name_1 IS NULL AS category_guessed,
    NULLIF(a.as_brand::text, ''::text) AS brand,
    NULLIF(a.as_model_info::text, ''::text) AS model,
    NULLIF(a.as_sn::text, ''::text) AS serial_no,
    NULLIF(a.mac_address::text, ''::text) AS mac_address,
    NULLIF(a.as_location::text, ''::text) AS location_code,
    loc.name_1 AS location_name,
    NULLIF(a.department_code::text, ''::text) AS department_code,
    dep.name_1 AS department_name,
    a.department_code::text = '8001'::text AS owned_by_it,
    a.create_date_time_now AS registered_at,
    s.cpu,
    s.ram,
    s.storage,
    s.gpu,
    s.os,
    s.screen,
    s.spec_note,
    s.asset_code IS NOT NULL AS has_spec,
    COALESCE(s.purchase_date, d.as_buy_date, a.create_date_time_now::date) AS purchase_date,
        CASE
            WHEN s.purchase_date IS NOT NULL THEN 'it'::text
            WHEN d.as_buy_date IS NOT NULL THEN 'erp'::text
            WHEN a.create_date_time_now IS NOT NULL THEN 'registered'::text
            ELSE 'unknown'::text
        END AS purchase_date_source,
    COALESCE(s.purchase_price, NULLIF(d.as_buy_price, 0::numeric)) AS purchase_price,
    COALESCE(NULLIF(d.as_buy_year, 0)::integer, date_part('year'::text, COALESCE(s.purchase_date::timestamp without time zone, d.as_buy_date::timestamp without time zone, a.create_date_time_now))::integer) AS buy_year,
    COALESCE(s.warranty_until, d.insure_stop_date, (COALESCE(s.purchase_date, d.as_buy_date, a.create_date_time_now::date) + '1 year'::interval)::date) AS warranty_until,
        CASE
            WHEN s.warranty_until IS NOT NULL THEN 'it'::text
            WHEN d.insure_stop_date IS NOT NULL THEN 'erp'::text
            ELSE 'auto'::text
        END AS warranty_source,
    s.warranty_note,
        CASE
            WHEN COALESCE(s.warranty_until, d.insure_stop_date, (COALESCE(s.purchase_date, d.as_buy_date, a.create_date_time_now::date) + '1 year'::interval)::date) < CURRENT_DATE THEN 'expired'::text
            WHEN COALESCE(s.warranty_until, d.insure_stop_date, (COALESCE(s.purchase_date, d.as_buy_date, a.create_date_time_now::date) + '1 year'::interval)::date) < (CURRENT_DATE + 60) THEN 'expiring'::text
            ELSE 'valid'::text
        END AS warranty_status,
    h.emp_code AS holder_code,
    h.emp_name AS holder_name,
    h.department_name AS holder_department,
    h.borrow_doc_no,
    h.from_date AS borrowed_at,
    h.holder_source,
    h.item_code IS NOT NULL AS is_assigned,
    COALESCE(mv.total, 0::bigint) AS movement_count,
    COALESCE(rp.total, 0::bigint) AS repair_count
   FROM as_asset a
     LEFT JOIN as_asset_detail d ON d.as_code::text = a.code::text
     LEFT JOIN as_asset_type t ON t.code::text = a.as_type::text
     LEFT JOIN as_asset_location loc ON loc.code::text = a.as_location::text
     LEFT JOIN odg_it_category cat ON cat.code::text = a.as_category::text
     LEFT JOIN erp_department_list dep ON dep.code::text = a.department_code::text
     LEFT JOIN it.v_asset_holders h ON h.item_code::text = a.code::text
     LEFT JOIN it.asset_specs s ON s.asset_code::text = a.code::text
     LEFT JOIN ( SELECT v_asset_movements.asset_code,
            count(*) AS total
           FROM it.v_asset_movements
          GROUP BY v_asset_movements.asset_code) mv ON mv.asset_code::text = a.code::text
     LEFT JOIN ( SELECT v_asset_repairs.asset_code,
            count(*) AS total
           FROM it.v_asset_repairs
          GROUP BY v_asset_repairs.asset_code) rp ON rp.asset_code::text = a.code::text
  WHERE a.code::text ~~ '200-%'::text;

-- ---------- ລວມ ERP + ທະບຽນຂອງລະບົບນີ້ ----------
-- ລຳດັບ ແລະ ຊະນິດຂອງຄໍລຳຕ້ອງກົງກັບຂອງເກົ່າແປະ ບໍ່ດັ່ງນັ້ນ
-- `create or replace` ຈະລົ້ມ ແລະ view ທີ່ອີງໃສ່ (v_damaged_assets,
-- v_asset_deployments) ຈະພັງນຳ
create or replace view it.v_it_assets as
select * from it.v_erp_assets
union all
select la.asset_code::varchar(25)                      as asset_code,
       la.name::varchar(100)                           as name,
       null::varchar(25)                               as type_code,
       'ລົງທະບຽນໃນລະບົບ IT'::varchar(100)              as type_name,
       false                                           as type_mismatch,
       la.is_active,
       la.category_code::varchar                       as category_code,
       coalesce(cat.name_1, 'ອື່ນໆ')::varchar          as category_name,
       cat.name_1 is null                              as category_guessed,
       nullif(la.brand::text, '')                      as brand,
       nullif(la.model::text, '')                      as model,
       nullif(la.serial_no::text, '')                  as serial_no,
       nullif(la.mac_address::text, '')                as mac_address,
       nullif(la.location_code::text, '')              as location_code,
       loc.name_1                                      as location_name,
       nullif(la.department_code::text, '')            as department_code,
       dep.name_1                                      as department_name,
       la.department_code::text = '8001'::text         as owned_by_it,
       la.registered_at::timestamp without time zone   as registered_at,
       s.cpu, s.ram, s.storage, s.gpu, s.os, s.screen, s.spec_note,
       s.asset_code is not null                        as has_spec,
       coalesce(s.purchase_date, la.purchase_date,
                la.registered_at::date)                as purchase_date,
       case
         when s.purchase_date is not null  then 'it'
         when la.purchase_date is not null then 'local'
         else 'registered'
       end                                             as purchase_date_source,
       coalesce(s.purchase_price, la.purchase_price)::numeric
                                                       as purchase_price,
       date_part('year',
         coalesce(s.purchase_date, la.purchase_date,
                  la.registered_at::date))::integer    as buy_year,
       coalesce(s.warranty_until,
                (coalesce(s.purchase_date, la.purchase_date,
                          la.registered_at::date) + interval '1 year')::date)
                                                       as warranty_until,
       case when s.warranty_until is not null then 'it' else 'auto' end
                                                       as warranty_source,
       s.warranty_note,
       case
         when coalesce(s.warranty_until,
                (coalesce(s.purchase_date, la.purchase_date,
                          la.registered_at::date) + interval '1 year')::date)
              < current_date then 'expired'
         when coalesce(s.warranty_until,
                (coalesce(s.purchase_date, la.purchase_date,
                          la.registered_at::date) + interval '1 year')::date)
              < current_date + 60 then 'expiring'
         else 'valid'
       end                                             as warranty_status,
       h.emp_code                                      as holder_code,
       h.emp_name                                      as holder_name,
       h.department_name                               as holder_department,
       h.borrow_doc_no,
       h.from_date                                     as borrowed_at,
       h.holder_source,
       h.item_code is not null                         as is_assigned,
       coalesce(mv.total, 0::bigint)                   as movement_count,
       coalesce(rp.total, 0::bigint)                   as repair_count
  from it.local_assets la
  left join public.odg_it_category cat on cat.code::text = la.category_code::text
  left join public.as_asset_location loc on loc.code::text = la.location_code::text
  left join public.erp_department_list dep on dep.code::text = la.department_code::text
  left join it.v_asset_holders h on h.item_code::text = la.asset_code::text
  left join it.asset_specs s on s.asset_code::text = la.asset_code::text
  left join (select asset_code, count(*) as total
               from it.v_asset_movements group by asset_code) mv
         on mv.asset_code::text = la.asset_code::text
  left join (select asset_code, count(*) as total
               from it.v_asset_repairs group by asset_code) rp
         on rp.asset_code::text = la.asset_code::text;
