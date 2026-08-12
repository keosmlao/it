-- 002_tickets.sql
-- ໂມດູນ Ticket ແຈ້ງບັນຫາ ພ້ອມ SLA

-- ປະເພດບັນຫາ (ແກ້ໄຂໄດ້ໂດຍ manager)
create table it.ticket_categories (
  code       varchar(20) primary key,
  name_lo    varchar(100) not null,
  unit_code  varchar(20),            -- ໜ່ວຍງານທີ່ຮັບຜິດຊອບໂດຍປົກກະຕິ
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

insert into it.ticket_categories (code, name_lo, unit_code, sort_order) values
  ('HARDWARE', 'ອຸປະກອນ / ຮາດແວ',            '8010', 1),
  ('SOFTWARE', 'ໂປຣແກຣມ / ຊອບແວ',            '8010', 2),
  ('NETWORK',  'ເຄືອຂ່າຍ / ອິນເຕີເນັດ',        '8010', 3),
  ('ACCOUNT',  'ບັນຊີຜູ້ໃຊ້ / ສິດເຂົ້າໃຊ້',      '8010', 4),
  ('PRINTER',  'ເຄື່ອງພິມ / ສະແກນ',            '8010', 5),
  ('ERP',      'ລະບົບພາຍໃນ / ERP',            '8011', 6),
  ('DATA',     'ຂໍ້ມູນ / ລາຍງານ',              '8011', 7),
  ('DEVELOP',  'ຂໍພັດທະນາ / ປັບປຸງລະບົບ',      '8011', 8),
  ('OTHER',    'ອື່ນໆ',                       null,   99);

-- ຂໍ້ຕົກລົງລະດັບການບໍລິການ (ນັບເປັນນາທີແບບປະຕິທິນ)
create table it.sla_policies (
  priority        varchar(10) primary key
                  check (priority in ('low','medium','high','critical')),
  name_lo         varchar(50) not null,
  respond_minutes integer not null,
  resolve_minutes integer not null,
  sort_order      integer not null
);

insert into it.sla_policies
  (priority, name_lo, respond_minutes, resolve_minutes, sort_order) values
  ('critical', 'ດ່ວນທີ່ສຸດ',    15,   240, 1),   -- ຕອບ 15 ນາທີ / ແກ້ 4 ຊມ
  ('high',     'ດ່ວນ',          60,   480, 2),   -- ຕອບ 1 ຊມ / ແກ້ 8 ຊມ
  ('medium',   'ປານກາງ',       240,  1440, 3),   -- ຕອບ 4 ຊມ / ແກ້ 1 ມື້
  ('low',      'ບໍ່ດ່ວນ',       480,  4320, 4);  -- ຕອບ 8 ຊມ / ແກ້ 3 ມື້

-- ເລກ ticket ແຍກຕາມປີ: IT-2026-0001
create table it.ticket_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create function it.next_ticket_no() returns varchar
language plpgsql as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.ticket_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.ticket_counters.last_no + 1
  returning last_no into n;

  return 'IT-' || y::text || '-' || lpad(n::text, 4, '0');
end $$;

create table it.tickets (
  id                     bigserial primary key,
  ticket_no              varchar(20) not null unique default it.next_ticket_no(),
  title                  varchar(200) not null,
  description            text,
  category_code          varchar(20) not null references it.ticket_categories(code),
  priority               varchar(10) not null references it.sla_policies(priority),
  status                 varchar(20) not null default 'new'
                         check (status in ('new','assigned','in_progress','pending',
                                           'resolved','closed','cancelled')),

  -- ຜູ້ແຈ້ງ = ພະນັກງານຄົນໃດກໍໄດ້ໃນບໍລິສັດ; ຜູ້ຮັບຜິດຊອບ = ພະນັກງານ IT ເທົ່ານັ້ນ
  requester_employee_id  integer not null,
  assignee_employee_id   integer,
  unit_code              varchar(20),

  sla_respond_due_at     timestamptz not null,
  sla_resolve_due_at     timestamptz not null,
  first_responded_at     timestamptz,
  resolved_at            timestamptz,
  closed_at              timestamptz,
  resolution             text,

  created_by             integer not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create index tickets_status_idx   on it.tickets (status) where deleted_at is null;
create index tickets_assignee_idx on it.tickets (assignee_employee_id) where deleted_at is null;
create index tickets_unit_idx     on it.tickets (unit_code) where deleted_at is null;
create index tickets_created_idx  on it.tickets (created_at desc);

-- ການສົນທະນາ ແລະ ບັນທຶກເຫດການ (ລວມໄວ້ຕາຕະລາງດຽວ ເພື່ອໃຫ້ timeline ຮຽງງ່າຍ)
create table it.ticket_comments (
  id          bigserial primary key,
  ticket_id   bigint not null references it.tickets(id) on delete cascade,
  kind        varchar(20) not null default 'comment'
              check (kind in ('comment','status_change','assignment','system')),
  body        text not null,
  is_internal boolean not null default false,   -- ບັນທຶກພາຍໃນ ບໍ່ໃຫ້ຜູ້ແຈ້ງເຫັນ
  author_employee_id integer not null,
  created_at  timestamptz not null default now()
);

create index ticket_comments_ticket_idx on it.ticket_comments (ticket_id, created_at);

-- ມຸມມອງລວມ: ຊື່ຜູ້ແຈ້ງ/ຜູ້ຮັບຜິດຊອບ ແລະ ສະຖານະ SLA
create view it.v_tickets as
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
       t.status in ('resolved','closed','cancelled')                 as is_finished,
       t.first_responded_at is null
         and now() > t.sla_respond_due_at                            as respond_overdue,
       t.resolved_at is null
         and t.status not in ('closed','cancelled')
         and now() > t.sla_resolve_due_at                            as resolve_overdue
  from it.tickets t
  join it.ticket_categories c on c.code = t.category_code
  join it.sla_policies s      on s.priority = t.priority
  join public.odg_employee req on req.employee_id = t.requester_employee_id
  left join public.odg_department reqd on reqd.department_code = req.department_code
  left join public.odg_employee asg on asg.employee_id = t.assignee_employee_id
  left join public.odg_unit u on u.unit_code = t.unit_code
 where t.deleted_at is null;
