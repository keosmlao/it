-- 024_erp_loan_returns.sql
-- ຮັບຄືນອຸປະກອນຂອງ "ໃບຢືມທີ່ອອກຈາກ ERP" ໄດ້ຈາກລະບົບນີ້
--
-- ບັນຫາ: ໃບຢືມ ERP ທີ່ຍັງເປີດຢູ່ມີ 194 ແຖວ ແຕ່ຈະປິດໄດ້ຕ້ອງໄປອອກໃບຄືນໃນ ERP
-- ເທົ່ານັ້ນ. ກົດຂອງລະບົບນີ້ຄື **ບໍ່ຂຽນລົງ public.\*** (asset_trans ເປັນຂອງ
-- ລະບົບບັນຊີ) ຈຶ່ງເກັບ "ໃບຄືນຂອງ IT" ໄວ້ໃນ schema it ແລ້ວເອົາມາທັບ
-- (overlay) ຢູ່ຊັ້ນ view — ໃບຢືມ ERP ນັ້ນຈຶ່ງນັບເປັນຄືນແລ້ວທັນທີ
-- ທັງໃນປະຫວັດ, ຜູ້ຖືຄອງ, ລາຍການທວງຄືນ ແລະ ຈຳນວນເຄື່ອງໃນສາງ.

create table it.erp_loan_returns (
  id               bigserial primary key,
  return_doc_no    varchar(30) not null unique default it.next_loan_no('RTIT'),
  borrow_doc_no    varchar(30) not null,
  asset_code       varchar(40) not null,
  emp_code         varchar(20) not null,
  returned_at      date not null default current_date,
  return_condition varchar(20) not null default 'good'
                   check (return_condition in ('good', 'damaged', 'lost')),
  return_note      text,
  returned_by      integer not null,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- 1 ໃບຢືມ + 1 ເຄື່ອງ ຄືນໄດ້ເທື່ອດຽວ
create unique index erp_loan_returns_unique_idx
  on it.erp_loan_returns (borrow_doc_no, asset_code)
  where deleted_at is null;

create index erp_loan_returns_asset_idx
  on it.erp_loan_returns (asset_code) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- ປະຫວັດຢືມ–ຄືນ: ສາຂາ ERP ເອົາໃບຄືນຂອງ IT ມາທັບ
-- ໃຊ້ create or replace ໄດ້ເພາະລາຍຊື່/ຊະນິດຄໍລຳຄືເກົ່າທຸກປະການ
-- ---------------------------------------------------------------------------
create or replace view it.v_asset_movements as
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
       coalesce(r.return_doc_no, rr.return_doc_no)      as return_doc_no,
       coalesce(r.to_date, rr.returned_at)              as returned_at,
       rr.return_condition::varchar                     as return_condition,
       rr.return_note             as note,
       r.category_name,
       nullif(r.as_brand, '')     as brand,
       nullif(r.as_model_info, '') as model,
       nullif(r.as_sn, '')        as serial_no,
       r.return_doc_no is not null or rr.id is not null as is_returned
  from public.report_asset_trans_detail r
  left join public.odg_employee e     on e.employee_code     = r.emp_code
  left join public.odg_department hrd on hrd.department_code = e.department_code
  left join public.odg_division dv    on dv.division_code    = hrd.division_code
  left join public.odg_unit u         on u.unit_code         = e.unit_code
  left join it.erp_loan_returns rr    on rr.borrow_doc_no    = r.borrow_doc_no
                                     and rr.asset_code       = r.item_code
                                     and rr.deleted_at is null
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

-- ---------------------------------------------------------------------------
-- ເອກະສານ: ເພີ່ມ "ໃບຄືນຂອງ IT ທີ່ອອກທັບໃບຢືມ ERP"
-- ---------------------------------------------------------------------------
drop view it.v_asset_document_items;
drop view it.v_asset_documents;

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

-- ໃບຄືນທີ່ອອກຈາກລະບົບນີ້ (ຄູ່ກັບໃບຢືມຂອງລະບົບນີ້)
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
 where l.deleted_at is null and l.return_doc_no is not null

union all

-- ໃບຄືນທີ່ອອກຈາກລະບົບນີ້ ທັບໃບຢືມຂອງ ERP
select rr.return_doc_no,
       'return',
       'it',
       rr.returned_at::timestamp,
       rr.emp_code,
       emp.fullname_lo,
       nullif(emp.department_code, ''),
       hrd.department_name_lo,
       null::timestamp,
       rr.returned_at::timestamp,
       null::timestamp,
       case rr.return_condition
         when 'damaged' then 'ຄືນ — ເຄື່ອງເສຍຫາຍ'
         when 'lost'    then 'ຄືນ — ເຄື່ອງສູນຫາຍ'
         else 'ຄືນປົກກະຕິ'
       end,
       rr.return_note,
       ret.employee_code,
       ret.fullname_lo,
       null,
       null,
       1
  from it.erp_loan_returns rr
  left join public.odg_employee emp on emp.employee_code = rr.emp_code
  left join public.odg_department hrd on hrd.department_code = emp.department_code
  left join public.odg_employee ret on ret.employee_id = rr.returned_by
 where rr.deleted_at is null;

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
 where l.deleted_at is null and l.return_doc_no is not null

union all

select rr.return_doc_no,
       rr.asset_code,
       a.name_1,
       rr.borrow_doc_no,
       null::timestamp,
       rr.returned_at::timestamp,
       rr.return_note,
       nullif(a.as_brand, ''),
       nullif(a.as_model_info, ''),
       nullif(a.as_sn, ''),
       cat.name_1,
       false, false, false, false, false, false, false
  from it.erp_loan_returns rr
  left join public.as_asset a          on a.code   = rr.asset_code
  left join public.odg_it_category cat on cat.code = a.as_category
 where rr.deleted_at is null;
