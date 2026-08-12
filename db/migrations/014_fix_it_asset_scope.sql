-- 014_fix_it_asset_scope.sql
-- ແກ້ວິທີແຍກ "ຊັບສິນໄອທີ" ໃຫ້ຖືກຕ້ອງ
--
-- ພົບວ່າຄໍລຳ as_type ໃນ ERP ໃສ່ຜິດຢູ່ 14 ລາຍການ:
--   • 10 ລາຍການລະຫັດ 400-… ແຕ່ as_type='200'
--     (ຕັ່ງ, ໂຕະ, ຕູ້ເຢັນ, ໂທລະທັດ, ຕູ້ກົດນໍ້າ) → ບໍ່ແມ່ນເຄື່ອງໄອທີ ແຕ່ຖືກນັບເຂົ້າມາ
--   • 4 ລາຍການລະຫັດ 200-… ແຕ່ as_type='400'
--     (Monitor, Desktop, All-in-one, Notebook) → ເປັນເຄື່ອງໄອທີ ແຕ່ຕົກຫຼົ່ນ
--
-- ລະຫັດຊັບສິນຖືກຕັ້ງຕາມໝວດຢ່າງສະໝ່ຳສະເໝີກວ່າ (200-… = ອຸປະກອນໄອທີ)
-- ຈຶ່ງໃຊ້ລະຫັດເປັນຕົວແບ່ງແທນ as_type.
--
-- ໝາຍເຫດ: ນີ້ເປັນການແກ້ທີ່ປາຍທາງ — ຄວນແກ້ as_type ໃນລະບົບ ERP ນຳ.

drop view it.v_asset_movements;
drop view it.v_it_assets;

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

       -- ວັນທີຊື້: IT ປ້ອນເອງ → ERP → ວັນລົງທະບຽນ
       coalesce(
         s.purchase_date,
         d.as_buy_date,
         a.create_date_time_now::date
       )                                        as purchase_date,
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

       -- ປະກັນ: IT ປ້ອນເອງ → ERP → ຄິດເອງ 12 ເດືອນນັບຈາກວັນທີຊື້
       coalesce(
         s.warranty_until,
         d.insure_stop_date,
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
         when coalesce(
                s.warranty_until, d.insure_stop_date,
                (coalesce(s.purchase_date, d.as_buy_date,
                          a.create_date_time_now::date) + interval '12 months')::date
              ) is null then 'unknown'
         when coalesce(
                s.warranty_until, d.insure_stop_date,
                (coalesce(s.purchase_date, d.as_buy_date,
                          a.create_date_time_now::date) + interval '12 months')::date
              ) < current_date then 'expired'
         when coalesce(
                s.warranty_until, d.insure_stop_date,
                (coalesce(s.purchase_date, d.as_buy_date,
                          a.create_date_time_now::date) + interval '12 months')::date
              ) < current_date + 60 then 'expiring'
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
 where a.code like '200-%';   -- ລະຫັດ 200-… = ອຸປະກອນໄອທີ

create view it.v_asset_movements as
select r.item_code                 as asset_code,
       r.item_name                 as asset_name,
       r.emp_code,
       r.emp_name,
       r.department_code,
       r.department_name,
       r.borrow_doc_no,
       r.from_date                 as borrowed_at,
       r.return_doc_no,
       r.to_date                   as returned_at,
       r.category_name,
       nullif(r.as_brand, '')      as brand,
       nullif(r.as_model_info, '') as model,
       nullif(r.as_sn, '')         as serial_no,
       r.return_doc_no is not null as is_returned
  from public.report_asset_trans_detail r
 where r.item_code like '200-%';
