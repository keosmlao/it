-- 003_projects.sql
-- ໂປຣເຈັກພັດທະນາ, Task (Kanban) ແລະ ບັນທຶກຊົ່ວໂມງເຮັດວຽກ
-- (work_logs ຢູ່ໄຟລ໌ນີ້ນຳ ເພາະ view v_tasks ຕ້ອງລວມຊົ່ວໂມງທີ່ບັນທຶກແລ້ວ)

create table it.project_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create function it.next_project_no() returns varchar
language plpgsql as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.project_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.project_counters.last_no + 1
  returning last_no into n;

  return 'PRJ-' || y::text || '-' || lpad(n::text, 3, '0');
end $$;

create table it.projects (
  id                    bigserial primary key,
  project_no            varchar(20) not null unique default it.next_project_no(),
  name                  varchar(200) not null,
  description           text,
  status                varchar(20) not null default 'planning'
                        check (status in ('planning','active','on_hold','done','cancelled')),
  priority              varchar(10) not null default 'medium'
                        references it.sla_policies(priority),
  owner_employee_id     integer not null,          -- ຫົວໜ້າໂປຣເຈັກ (ພະນັກງານ IT)
  requester_employee_id integer,                   -- ພະແນກທີ່ຂໍ
  unit_code             varchar(20) default '8011',
  start_date            date,
  due_date              date,
  done_date             date,
  created_by            integer not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index projects_status_idx on it.projects (status) where deleted_at is null;

create table it.tasks (
  id                   bigserial primary key,
  project_id           bigint references it.projects(id) on delete cascade,
  title                varchar(200) not null,
  description          text,
  status               varchar(20) not null default 'todo'
                       check (status in ('backlog','todo','in_progress','review','testing','done','cancelled')),
  priority             varchar(10) not null default 'medium'
                       references it.sla_policies(priority),
  assignee_employee_id integer,
  unit_code            varchar(20),
  due_date             date,
  estimate_hours       numeric(6,2),
  done_at              timestamptz,
  sort_order           integer not null default 0,
  created_by           integer not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index tasks_project_idx  on it.tasks (project_id) where deleted_at is null;
create index tasks_assignee_idx on it.tasks (assignee_employee_id) where deleted_at is null;
create index tasks_status_idx   on it.tasks (status) where deleted_at is null;

create table it.task_comments (
  id                 bigserial primary key,
  task_id            bigint not null references it.tasks(id) on delete cascade,
  kind               varchar(20) not null default 'comment'
                     check (kind in ('comment','status_change','assignment','system')),
  body               text not null,
  author_employee_id integer not null,
  created_at         timestamptz not null default now()
);

create index task_comments_task_idx on it.task_comments (task_id, created_at);

-- ຊົ່ວໂມງເຮັດວຽກ: ຜູກກັບ ticket ຫຼື task ຫຼື ວຽກທົ່ວໄປ (ຢ່າງໃດຢ່າງໜຶ່ງ)
create table it.work_logs (
  id          bigserial primary key,
  employee_id integer     not null,
  log_date    date        not null default current_date,
  hours       numeric(5,2) not null check (hours > 0 and hours <= 24),
  ticket_id   bigint references it.tickets(id) on delete cascade,
  task_id     bigint references it.tasks(id) on delete cascade,
  work_type   varchar(30),        -- ໃຊ້ເມື່ອບໍ່ໄດ້ຜູກກັບ ticket/task
  note        text,
  created_at  timestamptz not null default now(),
  constraint work_logs_one_target check (
    (ticket_id is not null and task_id is null)
    or (ticket_id is null and task_id is not null)
    or (ticket_id is null and task_id is null and work_type is not null)
  )
);

create index work_logs_employee_date_idx on it.work_logs (employee_id, log_date desc);
create index work_logs_ticket_idx on it.work_logs (ticket_id);
create index work_logs_task_idx   on it.work_logs (task_id);

create view it.v_projects as
select p.*,
       own.fullname_lo as owner_name,
       own.nickname    as owner_nickname,
       req.fullname_lo as requester_name,
       reqd.department_name_lo as requester_department_name,
       s.name_lo       as priority_name_lo,
       s.sort_order    as priority_order,
       u.unit_name_lo,
       p.status in ('done','cancelled') as is_finished,
       (select count(*) from it.tasks t
         where t.project_id = p.id and t.deleted_at is null)          as task_count,
       (select count(*) from it.tasks t
         where t.project_id = p.id and t.deleted_at is null
           and t.status = 'done')                                     as task_done_count,
       p.due_date is not null and p.due_date < current_date
         and p.status not in ('done','cancelled')                     as is_overdue
  from it.projects p
  join public.odg_employee own on own.employee_id = p.owner_employee_id
  join it.sla_policies s on s.priority = p.priority
  left join public.odg_employee req on req.employee_id = p.requester_employee_id
  left join public.odg_department reqd on reqd.department_code = req.department_code
  left join public.odg_unit u on u.unit_code = p.unit_code
 where p.deleted_at is null;

create view it.v_tasks as
select t.*,
       p.name       as project_name,
       p.project_no as project_no,
       asg.fullname_lo as assignee_name,
       asg.nickname    as assignee_nickname,
       s.name_lo       as priority_name_lo,
       s.sort_order    as priority_order,
       t.status in ('done','cancelled') as is_finished,
       t.due_date is not null and t.due_date < current_date
         and t.status not in ('done','cancelled') as is_overdue,
       coalesce((select sum(w.hours) from it.work_logs w where w.task_id = t.id), 0)
         as logged_hours
  from it.tasks t
  left join it.projects p on p.id = t.project_id
  left join public.odg_employee asg on asg.employee_id = t.assignee_employee_id
  join it.sla_policies s on s.priority = t.priority
 where t.deleted_at is null;
