-- 019_asset_documents.sql
-- ດຶງ "ເອກະສານ" ໃບຢືມ ແລະ ໃບຄືນ ມາເຕັມໃບ
--
-- ເມື່ອກ່ອນລະບົບອ່ານແຕ່ report_asset_trans_detail ເຊິ່ງເປັນລະດັບແຖວ
-- ຈຶ່ງເສຍຂໍ້ມູນສຳຄັນຂອງໃບໄປ:
--   asset_trans        → ເຫດຜົນ, ໝາຍເຫດ, ຜູ້ອອກໃບ, ຜູ້ອະນຸມັດ, ພະແນກ
--   asset_trans_detail → ອຸປະກອນເສີມທີ່ໃຫ້ໄປນຳ (ເມົ້າ, ແປ້ນ, ສາຍສາກ, ຫູຟັງ, ກະເປົາ,
--                        ເບີໂທ, ອີເມວ) ແລະ ໃບຄືນອ້າງອີງໃບຢືມ (doc_ref)
--
-- doc_type: 10 = ໃບຢືມ (BRIT…) · 20 = ໃບຄືນ (RTIT…)

create view it.v_asset_documents as
select t.doc_no,
       case when t.doc_type = 20 then 'return' else 'borrow' end as doc_kind,
       'erp'::varchar                          as source,
       t.doc_date,
       t.emp_code,
       emp.fullname_lo                         as emp_name,
       nullif(t.department_code, '')           as department_code,
       coalesce(hrd.department_name_lo, erpd.name_1) as department_name,
       t.from_date,
       t.to_date,
       t.anticipate_return,
       nullif(t.reason, '')                    as reason,
       nullif(t.remark, '')                    as remark,
       nullif(t.creator_code, '')              as creator_code,
       creator.fullname_lo                     as creator_name,
       nullif(t.approve_code, '')              as approve_code,
       approver.fullname_lo                    as approver_name,
       (select count(*) from public.asset_trans_detail d
         where d.doc_no = t.doc_no)            as item_count
  from public.asset_trans t
  left join public.odg_employee emp      on emp.employee_code      = t.emp_code
  left join public.odg_employee creator  on creator.employee_code  = t.creator_code
  left join public.odg_employee approver on approver.employee_code = t.approve_code
  left join public.odg_department hrd    on hrd.department_code    = emp.department_code
  left join public.erp_department_list erpd on erpd.code           = t.department_code

union all

-- ໃບຢືມທີ່ອອກຈາກລະບົບນີ້
select l.borrow_doc_no,
       'borrow',
       'it',
       l.borrowed_at::timestamp,
       l.emp_code,
       emp.fullname_lo,
       nullif(emp.department_code, ''),
       hrd.department_name_lo,
       l.borrowed_at::timestamp,
       null::timestamp,
       l.expected_return::timestamp,
       null,
       l.borrow_note,
       creator.employee_code,
       creator.fullname_lo,
       null,
       null,
       1
  from it.asset_loans l
  left join public.odg_employee emp     on emp.employee_code = l.emp_code
  left join public.odg_department hrd   on hrd.department_code = emp.department_code
  left join public.odg_employee creator on creator.employee_id = l.created_by
 where l.deleted_at is null

union all

-- ໃບຄືນທີ່ອອກຈາກລະບົບນີ້
select l.return_doc_no,
       'return',
       'it',
       l.returned_at::timestamp,
       l.emp_code,
       emp.fullname_lo,
       nullif(emp.department_code, ''),
       hrd.department_name_lo,
       null::timestamp,
       l.returned_at::timestamp,
       null::timestamp,
       case l.return_condition
         when 'damaged' then 'ຄືນ — ເຄື່ອງເສຍຫາຍ'
         when 'lost'    then 'ຄືນ — ເຄື່ອງສູນຫາຍ'
         else 'ຄືນປົກກະຕິ'
       end,
       l.return_note,
       ret.employee_code,
       ret.fullname_lo,
       null,
       null,
       1
  from it.asset_loans l
  left join public.odg_employee emp on emp.employee_code = l.emp_code
  left join public.odg_department hrd on hrd.department_code = emp.department_code
  left join public.odg_employee ret on ret.employee_id = l.returned_by
 where l.deleted_at is null and l.return_doc_no is not null;

-- ລາຍການເຄື່ອງໃນແຕ່ລະໃບ ພ້ອມອຸປະກອນເສີມ
create view it.v_asset_document_items as
select d.doc_no,
       d.item_code                 as asset_code,
       d.item_name                 as asset_name,
       nullif(d.doc_ref, '')       as ref_doc_no,
       d.from_date,
       d.to_date,
       nullif(d.remark, '')        as remark,
       nullif(a.as_brand, '')      as brand,
       nullif(a.as_model_info, '') as model,
       nullif(a.as_sn, '')         as serial_no,
       cat.name_1                  as category_name,
       -- ອຸປະກອນເສີມທີ່ໃຫ້ໄປພ້ອມ
       coalesce(d.is_mouse, 0) = 1        as has_mouse,
       coalesce(d.is_keyboard, 0) = 1     as has_keyboard,
       coalesce(d.is_power, 0) = 1        as has_power,
       coalesce(d.is_headphone, 0) = 1    as has_headphone,
       coalesce(d.id_bag, 0) = 1          as has_bag,
       coalesce(d.is_phone_number, 0) = 1 as has_phone_number,
       coalesce(d.is_email, 0) = 1        as has_email
  from public.asset_trans_detail d
  left join public.as_asset a          on a.code   = d.item_code
  left join public.odg_it_category cat on cat.code = a.as_category

union all

select l.borrow_doc_no,
       l.asset_code,
       a.name_1,
       null,
       l.borrowed_at::timestamp,
       null::timestamp,
       l.borrow_note,
       nullif(a.as_brand, ''),
       nullif(a.as_model_info, ''),
       nullif(a.as_sn, ''),
       cat.name_1,
       false, false, false, false, false, false, false
  from it.asset_loans l
  left join public.as_asset a          on a.code   = l.asset_code
  left join public.odg_it_category cat on cat.code = a.as_category
 where l.deleted_at is null

union all

select l.return_doc_no,
       l.asset_code,
       a.name_1,
       l.borrow_doc_no,
       null::timestamp,
       l.returned_at::timestamp,
       l.return_note,
       nullif(a.as_brand, ''),
       nullif(a.as_model_info, ''),
       nullif(a.as_sn, ''),
       cat.name_1,
       false, false, false, false, false, false, false
  from it.asset_loans l
  left join public.as_asset a          on a.code   = l.asset_code
  left join public.odg_it_category cat on cat.code = a.as_category
 where l.deleted_at is null and l.return_doc_no is not null;
