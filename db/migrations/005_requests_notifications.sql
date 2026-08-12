-- 005_requests_notifications.sql
-- ຄຳຮ້ອງ + ການອະນຸມັດ 2 ຂັ້ນ, ການແຈ້ງເຕືອນ ແລະ ບັນທຶກການປ່ຽນແປງ

create table it.request_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create function it.next_request_no() returns varchar
language plpgsql as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.request_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.request_counters.last_no + 1
  returning last_no into n;

  return 'REQ-' || y::text || '-' || lpad(n::text, 3, '0');
end $$;

create table it.request_types (
  code       varchar(20) primary key,
  name_lo    varchar(100) not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

insert into it.request_types (code, name_lo, sort_order) values
  ('DEVELOP', 'ຂໍພັດທະນາ / ປັບປຸງລະບົບ', 1),
  ('ASSET',   'ຂໍອຸປະກອນ',                2),
  ('ACCESS',  'ຂໍສິດເຂົ້າໃຊ້ລະບົບ',        3),
  ('BUDGET',  'ຂໍງົບປະມານ',               4),
  ('OTHER',   'ອື່ນໆ',                    9);

-- ຂັ້ນຕອນ: submitted → (ຫົວໜ້າ) head_approved → (ຜູ້ຈັດການ) approved → done
create table it.requests (
  id                    bigserial primary key,
  request_no            varchar(20) not null unique default it.next_request_no(),
  type_code             varchar(20) not null references it.request_types(code),
  title                 varchar(200) not null,
  detail                text,
  requester_employee_id integer not null,
  unit_code             varchar(20),
  status                varchar(20) not null default 'submitted'
                        check (status in ('submitted','head_approved','approved',
                                          'rejected','cancelled','done')),
  current_level         integer not null default 1,   -- 1 = ຫົວໜ້າ, 2 = ຜູ້ຈັດການ
  linked_project_id     bigint references it.projects(id),
  created_by            integer not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index requests_status_idx on it.requests (status) where deleted_at is null;

create table it.approvals (
  id                  bigserial primary key,
  request_id          bigint not null references it.requests(id) on delete cascade,
  level               integer not null check (level in (1, 2)),
  approver_employee_id integer not null,
  decision            varchar(10) not null check (decision in ('approved','rejected')),
  note                text,
  decided_at          timestamptz not null default now()
);

create index approvals_request_idx on it.approvals (request_id, level);

create view it.v_requests as
select r.*,
       t.name_lo as type_name_lo,
       req.fullname_lo as requester_name,
       reqd.department_name_lo as requester_department_name,
       u.unit_name_lo,
       r.status in ('approved','rejected','cancelled','done') as is_finished,
       (select count(*) from it.approvals a where a.request_id = r.id) as approval_count
  from it.requests r
  join it.request_types t on t.code = r.type_code
  join public.odg_employee req on req.employee_id = r.requester_employee_id
  left join public.odg_department reqd on reqd.department_code = req.department_code
  left join public.odg_unit u on u.unit_code = r.unit_code
 where r.deleted_at is null;

create table it.notifications (
  id          bigserial primary key,
  employee_id integer not null,
  title       varchar(200) not null,
  body        text,
  link        varchar(200),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_unread_idx
  on it.notifications (employee_id, created_at desc)
  where is_read = false;

create table it.audit_logs (
  id          bigserial primary key,
  employee_id integer not null,
  entity      varchar(40) not null,      -- ticket, project, task, asset, request …
  entity_id   varchar(40),
  action      varchar(40) not null,      -- create, update, status, assign, delete
  detail      text,
  created_at  timestamptz not null default now()
);

create index audit_logs_entity_idx on it.audit_logs (entity, entity_id, created_at desc);
create index audit_logs_time_idx   on it.audit_logs (created_at desc);
