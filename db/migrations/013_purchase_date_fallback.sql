-- 013_purchase_date_fallback.sql
-- ວັນທີຊື້: ຖ້າບໍ່ມີ ໃຫ້ໃຊ້ວັນທີລົງທະບຽນຊັບສິນແທນ
--
-- ລຳດັບການເລືອກ: ຂອງ IT ປ້ອນເອງ → ຂອງ ERP → ວັນທີລົງທະບຽນ
-- ພ້ອມບອກແຫຼ່ງທີ່ມາ (purchase_date_source) ເພື່ອໃຫ້ໜ້າຈໍໝາຍໄວ້ວ່າ
-- ອັນໃດເປັນວັນຊື້ແທ້ ອັນໃດເປັນການປະມານຈາກວັນລົງທະບຽນ

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

       s.cpu, s.ram, s.storage, s.gpu, s.os, s.screen, s.spec_note,
       s.asset_code is not null                 as has_spec,

       -- ວັນທີຊື້: IT → ERP → ວັນລົງທະບຽນ
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
