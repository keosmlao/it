-- 007_erp_assets.sql
-- ດຶງທະບຽນຊັບສິນຈິງທີ່ມີຢູ່ແລ້ວມາໃຊ້ ແທນທີ່ຈະໃຫ້ພະແນກ IT ປ້ອນຊ້ຳ
--
-- ຕາຕະລາງຕົ້ນທາງ (schema public, ເປັນຂອງລະບົບ ERP — ອ່ານຢ່າງດຽວ):
--   as_asset                   ທະບຽນຊັບສິນ 623 ລາຍການ (as_type '200' = ອຸປະກອນໄອທີ)
--   as_asset_detail            ຂໍ້ມູນການຊື້, ລາຄາ, ປະກັນ
--   as_asset_type              ປະເພດຊັບສິນໃຫຍ່ (100–800)
--   as_asset_location          ສະຖານທີ່ (ຫ້ອງການ/ສາງ/ສາຂາ)
--   odg_it_category            ປະເພດອຸປະກອນໄອທີ (NOTEBOOK, PRINTER …)
--   erp_department_list        ພະແນກຕາມລະຫັດ ERP
--   report_asset_trans_detail  ປະຫວັດຢືມ–ຄືນ (ຄືນແລ້ວ = ມີ return_doc_no)

-- ຜູ້ຖືຄອງປັດຈຸບັນ = ໃບຢືມຫຼ້າສຸດທີ່ຍັງບໍ່ມີໃບຄືນ
create view it.v_asset_holders as
select distinct on (item_code)
       item_code,
       emp_code,
       emp_name,
       department_code,
       department_name,
       borrow_doc_no,
       from_date
  from public.report_asset_trans_detail
 where return_doc_no is null
 order by item_code, from_date desc nulls last;

create view it.v_it_assets as
select a.code                                   as asset_code,
       a.name_1                                 as name,
       a.as_type                                as type_code,
       t.name_1                                 as type_name,
       a.as_category                            as category_code,
       cat.name_1                               as category_name,
       nullif(a.as_brand, '')                   as brand,
       nullif(a.as_model_info, '')              as model,
       nullif(a.as_sn, '')                      as serial_no,
       nullif(a.mac_address, '')                as mac_address,
       nullif(a.as_location, '')                as location_code,
       loc.name_1                               as location_name,
       nullif(a.department_code, '')            as department_code,
       dep.name_1                               as department_name,
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
       d.insure_stop_date is not null
         and d.insure_stop_date < current_date  as warranty_expired,
       d.insure_stop_date is not null
         and d.insure_stop_date >= current_date
         and d.insure_stop_date < current_date + 60 as warranty_expiring
  from public.as_asset a
  left join public.as_asset_detail d   on d.as_code   = a.code
  left join public.as_asset_type t     on t.code      = a.as_type
  left join public.as_asset_location loc on loc.code  = a.as_location
  left join public.odg_it_category cat on cat.code    = a.as_category
  left join public.erp_department_list dep on dep.code = a.department_code
  left join it.v_asset_holders h       on h.item_code = a.code
 where a.as_type = '200';   -- ສະເພາະເຄື່ອງຄອມພິວເຕີ ແລະ ອຸປະກອນໄອທີ

-- ປະຫວັດຢືມ–ຄືນ ພ້ອມສະຖານະ
create view it.v_asset_movements as
select r.item_code                as asset_code,
       r.item_name                as asset_name,
       r.emp_code,
       r.emp_name,
       r.department_code,
       r.department_name,
       r.borrow_doc_no,
       r.from_date                as borrowed_at,
       r.return_doc_no,
       r.to_date                  as returned_at,
       r.category_name,
       nullif(r.as_brand, '')     as brand,
       nullif(r.as_model_info, '') as model,
       nullif(r.as_sn, '')        as serial_no,
       r.return_doc_no is not null as is_returned
  from public.report_asset_trans_detail r;
