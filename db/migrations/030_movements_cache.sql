-- 030_movements_cache.sql
-- ເຮັດໃຫ້ໜ້າອຸປະກອນໄວຂຶ້ນ ໂດຍເກັບຜົນຂອງປະຫວັດຢືມ–ຄືນໄວ້ລ່ວງໜ້າ
--
-- ບັນຫາ: public.report_asset_trans_detail ຂອງ ERP ເປັນ view ທີ່ມີ subquery
-- ຕໍ່ແຖວຫຼາຍອັນ (ຊື່ຜູ້ຢືມ, ເລກໃບຄືນ, ວັນຄືນ, ຊື່ພະແນກ, ຊື່ປະເພດ …).
-- it.v_it_assets ອ້າງອີງປະຫວັດເຖິງ 3 ຮອບ (ຜູ້ຖືຄອງ + ນັບຄັ້ງຢືມ + ນັບຄັ້ງສ້ອມ)
-- ຈຶ່ງຕ້ອງຄິດ view ໜັກນັ້ນ 3 ເທື່ອທຸກຄັ້ງທີ່ເປີດໜ້າ = ~190ms ແລະ ອ່ານ
-- 18,503 ໜ້າ buffer ເພື່ອສະແດງພຽງ 20 ແຖວ.
--
-- ວິທີແກ້: ເກັບຜົນໄວ້ເປັນ materialized view (349 ແຖວ — ນ້ອຍຫຼາຍ) ແລ້ວໃຫ້
-- v_asset_movements ອ່ານຈາກນັ້ນ. ໂຄ້ດແອັບບໍ່ຕ້ອງແກ້ຫຍັງເລີຍ.
--
-- ຄວາມສົດຂອງຂໍ້ມູນ: ໃບຢືມທີ່ອອກຈາກ **ລະບົບນີ້** ຈະເຫັນທັນທີ ເພາະ action
-- ເອີ້ນ it.refresh_asset_movements() ໃຫ້ຫຼັງບັນທຶກ. ໃບທີ່ອອກຈາກ **ERP**
-- ຈະເຫັນເມື່ອ refresh ຮອບຖັດໄປ (ຕົວຈັດຕາຕະລາງເອີ້ນທຸກ 5 ນາທີ)

create materialized view it.asset_movements_mv as
select row_number() over () as mv_row, *
  from (
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
     where l.deleted_at is null
  ) m;

-- ຕ້ອງມີ unique index ຈຶ່ງ refresh ແບບ concurrently ໄດ້ (ບໍ່ລັອກຜູ້ອ່ານ)
create unique index asset_movements_mv_row_idx on it.asset_movements_mv (mv_row);

-- index ຕາມທາງທີ່ query ຖາມຫຼາຍທີ່ສຸດ
create index asset_movements_mv_asset_idx
  on it.asset_movements_mv (asset_code, is_returned);
create index asset_movements_mv_open_idx
  on it.asset_movements_mv (asset_code, borrowed_at desc, borrow_doc_no desc)
  where not is_returned;
create index asset_movements_mv_emp_idx on it.asset_movements_mv (emp_code);

-- ໃຫ້ຊື່ເກົ່າອ່ານຈາກ cache — ໂຄ້ດແອັບບໍ່ຕ້ອງແກ້
create or replace view it.v_asset_movements as
select source, asset_code, asset_name, emp_code, emp_name, department_code,
       department_name, division_code, division_name, hr_department_code,
       hr_department_name, unit_code, unit_name, org_department,
       is_former_employee, employment_status, borrow_doc_no, borrowed_at,
       expected_return, return_doc_no, returned_at, return_condition, note,
       category_name, brand, model, serial_no, is_returned
  from it.asset_movements_mv;

create function it.refresh_asset_movements() returns void
language plpgsql as $$
begin
  refresh materialized view concurrently it.asset_movements_mv;
exception when others then
  -- ຮອບທຳອິດ (ຫຼື ຫຼັງ index ເສຍ) concurrently ໃຊ້ບໍ່ໄດ້ — ຖອຍໄປແບບທຳມະດາ
  refresh materialized view it.asset_movements_mv;
end $$;
