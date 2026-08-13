-- 025_requester_role.sql
-- ໃຫ້ພະນັກງານພະແນກອື່ນເຂົ້າມາແຈ້ງບັນຫາເອງໄດ້ (role = requester)
--
-- ເມື່ອກ່ອນມີແຕ່ພະນັກງານພະແນກ 801 ເຂົ້າລະບົບໄດ້ ຄົນອື່ນຕ້ອງໂທ/ຝາກແຈ້ງ
-- ເຮັດໃຫ້ບໍ່ມີເລກ ticket ແລະ ນັບ SLA ບໍ່ໄດ້.
--
-- ຄວາມປອດໄພ: requester ເຫັນສະເພາະ ticket ທີ່ຕົນເປັນຜູ້ແຈ້ງ (ບັງຄັບຢູ່ຊັ້ນ query)
-- ແລະ ເຂົ້າໜ້າພາຍໃນຂອງພະແນກ IT ບໍ່ໄດ້ (ບັງຄັບຢູ່ layout ດຽວ)

create view it.v_portal_users as
select v.employee_id,
       v.employee_code,
       v.fullname_lo,
       v.nickname,
       v.unit_code,
       v.unit_name_lo,
       v.position_code,
       v.position_name_lo,
       v.role,
       true                    as is_it_staff,
       e.department_code,
       d.department_name_lo    as department_name
  from it.v_it_staff v
  join public.odg_employee e on e.employee_id = v.employee_id
  left join public.odg_department d on d.department_code = e.department_code

union all

select e.employee_id,
       e.employee_code,
       e.fullname_lo,
       e.nickname,
       nullif(e.unit_code, ''),
       u.unit_name_lo,
       e.position_code,
       p.position_name_lo,
       'requester'::varchar    as role,
       false,
       e.department_code,
       d.department_name_lo
  from public.odg_employee e
  left join public.odg_position p on p.position_code = e.position_code
  left join public.odg_unit u on u.unit_code = e.unit_code
  left join public.odg_department d on d.department_code = e.department_code
 where e.employment_status = 'ACTIVE'
   and coalesce(e.department_code, '') <> '801';
