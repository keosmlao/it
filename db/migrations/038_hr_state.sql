-- 038_hr_state.sql
-- ແຍກ "ລາອອກແທ້" ອອກຈາກ "ບໍ່ພົບໃນທະບຽນ HR"
--
-- ບັນຫາທີ່ພົບຈາກການກວດ: `is_former_employee` ນັບສອງກໍລະນີເປັນອັນດຽວກັນ
--     e.employee_id is null  or  e.employment_status <> 'ACTIVE'
--
-- ແຕ່ຂໍ້ມູນຈິງບອກວ່າສອງອັນນີ້ຕ່າງກັນຫຼາຍ:
--   · odg_employee ໝາຍ RESIGNED ພຽງ 2 ຄົນ
--   · ແຕ່ໃບຢືມ ERP ອ້າງອີງ 49 ລະຫັດທີ່ບໍ່ມີໃນຕາຕະລາງນັ້ນເລີຍ
--   · ວັນຈ້າງລ່າສຸດໃນ odg_employee ຄື 2026-03-02 ແຕ່ມີໃບຢືມ 2026-08-13
--     ໃນນາມລະຫັດ 26066 ຊຶ່ງເກີນເລກສູງສຸດ (26065) ຂອງທະບຽນ
--
-- ສະນັ້ນ "ບໍ່ພົບໃນ HR" ອາດໝາຍວ່າອອກໄປແລ້ວ ຫຼື ຍັງບໍ່ທັນຂຶ້ນທະບຽນກໍໄດ້ —
-- ລະບົບແຍກເອງບໍ່ໄດ້ ຈຶ່ງບໍ່ຄວນຂຽນວ່າ "ອອກແລ້ວ" ໃຫ້ພະນັກງານທີ່ຍັງເຮັດວຽກຢູ່.
--
-- ບໍ່ຕ້ອງສ້າງ matview ຄືນ — `employment_status` ມີຢູ່ໃນນັ້ນແລ້ວ
-- (null = ບໍ່ມີແຖວໃນ HR) ຈຶ່ງຄິດ hr_state ຢູ່ຊັ້ນ view ໄດ້ເລີຍ

create or replace view it.v_asset_movements as
select source, asset_code, asset_name, emp_code, emp_name, department_code,
       department_name, division_code, division_name, hr_department_code,
       hr_department_name, unit_code, unit_name, org_department,
       is_former_employee, employment_status, borrow_doc_no, borrowed_at,
       expected_return, return_doc_no, returned_at, return_condition, note,
       category_name, brand, model, serial_no, is_returned,
       -- ຕໍ່ທ້າຍເທົ່ານັ້ນ: `create or replace view` ປ່ຽນລຳດັບ ຫຼື
       -- ແຊກຄໍລຳກາງບໍ່ໄດ້ ມັນຈະຟ້ອງວ່າ "cannot change name of view column"
       case
         when not is_former_employee    then 'active'
         when employment_status is null then 'not_in_hr'
         else 'resigned'
       end                                        as hr_state
  from it.asset_movements_mv;

drop view if exists it.v_recovery_targets;

create view it.v_recovery_targets as
select m.asset_code,
       m.asset_name,
       m.emp_code,
       m.emp_name,
       m.org_department,
       m.division_name,
       m.borrow_doc_no,
       m.borrowed_at,
       m.is_former_employee,
       m.hr_state,
       m.source,
       (current_date - m.borrowed_at::date)      as days_held,
       r.id                                      as recovery_id,
       r.status                                  as recovery_status,
       r.contacted_at,
       r.promised_date,
       r.note                                    as recovery_note,
       case
         when m.hr_state = 'resigned'  then 'former'
         when m.hr_state = 'not_in_hr' then 'unknown_employee'
         when m.borrowed_at::date < current_date - 365 then 'long_held'
         else 'normal'
       end                                       as reason
  from it.v_asset_movements m
  left join it.asset_recoveries r
         on r.asset_code = m.asset_code
        and r.emp_code   = m.emp_code
        and r.status not in ('recovered', 'written_off')
 where not m.is_returned
   and (m.is_former_employee or m.borrowed_at::date < current_date - 365);
