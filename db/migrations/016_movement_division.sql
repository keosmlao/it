-- 016_movement_division.sql
-- ເພີ່ມ "ຝ່າຍ" (division) ເຂົ້າຂໍ້ມູນຢືມ–ຄືນ
-- ໂຄງສ້າງອົງກອນເຕັມ: ຝ່າຍ → ພະແນກ → ໜ່ວຍງານ
-- (odg_division → odg_department → odg_unit ຜ່ານລະຫັດພະນັກງານ)

drop view it.v_asset_movements;

create view it.v_asset_movements as
select r.item_code                 as asset_code,
       r.item_name                 as asset_name,
       r.emp_code,
       r.emp_name,
       r.department_code,
       r.department_name,

       -- ໂຄງສ້າງອົງກອນຈາກທະບຽນ HR
       nullif(dv.division_code, '')                     as division_code,
       dv.division_name_lo                              as division_name,
       nullif(e.department_code, '')                    as hr_department_code,
       hrd.department_name_lo                           as hr_department_name,
       nullif(e.unit_code, '')                          as unit_code,
       u.unit_name_lo                                   as unit_name,
       coalesce(hrd.department_name_lo, r.department_name) as org_department,

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
  left join public.odg_employee e     on e.employee_code     = r.emp_code
  left join public.odg_department hrd on hrd.department_code = e.department_code
  left join public.odg_division dv    on dv.division_code    = hrd.division_code
  left join public.odg_unit u         on u.unit_code         = e.unit_code
 where r.item_code like '200-%';
