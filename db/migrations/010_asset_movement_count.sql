-- 010_asset_movement_count.sql
-- ເພີ່ມຈຳນວນລາຍການຢືມ–ຄືນຂອງແຕ່ລະເຄື່ອງ
-- ເພື່ອໃຫ້ເຫັນຈາກລາຍການເລີຍວ່າເຄື່ອງໃດມີປະຫວັດ ແລະ ມີຈັກລາຍການ
-- (152 ໃນ 369 ເຄື່ອງຍັງບໍ່ເຄີຍມີໃບຢືມ ຈຶ່ງເປີດເຂົ້າໄປແລ້ວຫວ່າງເປົ່າ)

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
       d.as_buy_date,
       nullif(d.as_buy_year, 0)                 as buy_year,
       d.as_buy_price                           as buy_price,
       d.insure_stop_date                       as warranty_until,
       h.emp_code                               as holder_code,
       h.emp_name                               as holder_name,
       h.department_name                        as holder_department,
       h.borrow_doc_no,
       h.from_date                              as borrowed_at,
       h.item_code is not null                  as is_assigned,
       coalesce(mv.total, 0)                    as movement_count,
       d.insure_stop_date is not null
         and d.insure_stop_date < current_date  as warranty_expired,
       d.insure_stop_date is not null
         and d.insure_stop_date >= current_date
         and d.insure_stop_date < current_date + 60 as warranty_expiring
  from public.as_asset a
  left join public.as_asset_detail d     on d.as_code   = a.code
  left join public.as_asset_type t       on t.code      = a.as_type
  left join public.as_asset_location loc on loc.code    = a.as_location
  left join public.odg_it_category cat   on cat.code    = a.as_category
  left join public.erp_department_list dep on dep.code  = a.department_code
  left join it.v_asset_holders h         on h.item_code = a.code
  left join (
        select item_code, count(*) as total
          from public.report_asset_trans_detail
         group by item_code
       ) mv on mv.item_code = a.code
 where a.as_type = '200';
