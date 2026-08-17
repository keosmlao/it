-- 052_ticket_unrepairable.sql
-- ທາງອອກ "ສ້ອມບໍ່ໄດ້" ຂອງ ticket
--
-- ເຫດຜົນ: ການໄຫຼວຽກມີທາງອອກທາງດຽວຄື resolved ("ສຳເລັດ ລໍຖ້າສົ່ງຄືນ") ແຕ່ວຽກ
-- ຈິງມີບາງອັນສ້ອມບໍ່ໄດ້ — ເຄື່ອງເພເກີນສ້ອມ, ອາໄຫຼ່ບໍ່ມີແລ້ວ, ຄ່າສ້ອມແພງກວ່າຊື້ໃໝ່.
-- ເມື່ອກ່ອນຕ້ອງໄປລົງເປັນ resolved (ບໍ່ຈິງ — ບໍ່ໄດ້ແກ້) ຫຼື cancelled (ບໍ່ຈິງ —
-- ຜູ້ແຈ້ງບໍ່ໄດ້ຍົກເລີກ) ຈຶ່ງນັບບໍ່ໄດ້ວ່າປີໜຶ່ງສ້ອມບໍ່ໄດ້ຈັກເຄື່ອງ
--
-- ຝັ່ງອຸປະກອນມີແນວຄິດນີ້ຢູ່ແລ້ວ (it.asset_writeoffs.reason = 'beyond_repair')
-- ອັນນີ້ຄືທາງອອກອັນດຽວກັນແຕ່ຢູ່ຝັ່ງ ticket — ວຽກຈົບແລ້ວ ພຽງແຕ່ຈົບແບບບໍ່ສຳເລັດ
--
-- ນັບເປັນວຽກທີ່ຈົບ (is_finished) ຈຶ່ງບໍ່ຄ້າງຢູ່ຄິວ ແລະ ໂມງ SLA ຢຸດ

alter table it.tickets drop constraint if exists tickets_status_check;

alter table it.tickets add constraint tickets_status_check
  check (status in ('new', 'assigned', 'in_progress', 'pending',
                    'resolved', 'unrepairable', 'closed', 'cancelled'));

-- ຕໍ່ 'unrepairable' ໃສ່ 2 ບ່ອນ: ນັບເປັນວຽກຈົບ ແລະ ຢຸດໂມງກຳນົດແກ້ໄຂ
create or replace view it.v_tickets as
select t.*,
       c.name_lo  as category_name_lo,
       s.name_lo  as priority_name_lo,
       s.sort_order as priority_order,
       req.fullname_lo   as requester_name,
       req.department_code as requester_department_code,
       reqd.department_name_lo as requester_department_name,
       asg.fullname_lo   as assignee_name,
       asg.nickname      as assignee_nickname,
       u.unit_name_lo,
       t.status in ('resolved','unrepairable','closed','cancelled')  as is_finished,
       t.first_responded_at is null
         and now() > t.sla_respond_due_at                            as respond_overdue,
       t.resolved_at is null
         and t.status not in ('unrepairable','closed','cancelled')
         and now() > t.sla_resolve_due_at                            as resolve_overdue
  from it.tickets t
  join it.ticket_categories c on c.code = t.category_code
  join it.sla_policies s      on s.priority = t.priority
  join public.odg_employee req on req.employee_id = t.requester_employee_id
  left join public.odg_department reqd on reqd.department_code = req.department_code
  left join public.odg_employee asg on asg.employee_id = t.assignee_employee_id
  left join public.odg_unit u on u.unit_code = t.unit_code
 where t.deleted_at is null;
