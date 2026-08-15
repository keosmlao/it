-- 048_ticket_ratings.sql
-- ຄະແນນຄວາມພໍໃຈຫຼັງປິດ ticket (CSAT)
--
-- ເຫດຜົນ: ດຽວນີ້ວັດແຕ່ SLA ຄື "ໄວບໍ" — ແຕ່ບໍ່ຮູ້ວ່າ "ດີບໍ".
-- ວຽກທີ່ປິດທັນເວລາແຕ່ຜູ້ແຈ້ງຍັງໃຊ້ບໍ່ໄດ້ ຈະເບິ່ງຄືຜ່ານໝົດໃນລາຍງານ
--
-- ໃຫ້ຄະແນນໄດ້ສະເພາະຜູ້ແຈ້ງເອງ ແລະ ໄດ້ເທື່ອດຽວ (ticket_id ເປັນ primary key)
-- ແກ້ຄະແນນຄືນໄດ້ ແຕ່ບໍ່ໃຫ້ຄົນອື່ນມາໃຫ້ແທນ — ບັງຄັບຢູ່ຊັ້ນ server action

create table if not exists it.ticket_ratings (
  ticket_id  bigint primary key references it.tickets(id) on delete cascade,
  score      integer not null check (score between 1 and 5),
  comment    varchar(300),
  rated_by   integer not null,
  rated_at   timestamptz not null default now()
);

create or replace view it.v_ticket_ratings as
select r.ticket_id,
       t.ticket_no,
       t.title,
       t.category_code,
       cat.name_lo                    as category_name,
       t.assignee_employee_id,
       assignee.fullname_lo           as assignee_name,
       assignee.nickname              as assignee_nickname,
       t.requester_employee_id,
       requester.fullname_lo          as requester_name,
       t.resolved_at,
       t.closed_at,
       r.score,
       r.comment,
       r.rated_by,
       r.rated_at
  from it.ticket_ratings r
  join it.tickets t on t.id = r.ticket_id
  left join it.ticket_categories cat on cat.code::text = t.category_code::text
  left join public.odg_employee assignee  on assignee.employee_id  = t.assignee_employee_id
  left join public.odg_employee requester on requester.employee_id = t.requester_employee_id;
