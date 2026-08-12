-- 023_daily_plans.sql
-- ແຜນການເຮັດວຽກປະຈຳວັນຂອງພະນັກງານແຕ່ລະຄົນ
-- 1 ຄົນ = 1 ແຜນ/ວັນ, ພາຍໃນມີຫຼາຍລາຍການວຽກ ທີ່ຜູກກັບ ticket / task ໄດ້

create table it.daily_plans (
  id          bigserial primary key,
  employee_id integer not null,
  plan_date   date not null default current_date,
  status      varchar(12) not null default 'draft'
              check (status in ('draft','submitted','closed')),
  focus       varchar(200),               -- ເປົ້າໝາຍຫຼັກຂອງມື້
  blocker     text,                       -- ຕິດຂັດຫຍັງ
  submitted_at timestamptz,
  closed_at    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employee_id, plan_date)
);

create index daily_plans_date_idx on it.daily_plans (plan_date desc, employee_id);

create table it.daily_plan_items (
  id            bigserial primary key,
  plan_id       bigint not null references it.daily_plans(id) on delete cascade,
  sort_order    integer not null default 0,
  title         varchar(200) not null,
  detail        text,
  planned_hours numeric(5,2) not null default 1 check (planned_hours >= 0),
  actual_hours  numeric(5,2) check (actual_hours >= 0),
  status        varchar(12) not null default 'todo'
                check (status in ('todo','in_progress','done','blocked','carried')),
  ticket_id     bigint references it.tickets(id) on delete set null,
  task_id       bigint references it.tasks(id) on delete set null,
  project_id    bigint references it.projects(id) on delete set null,
  result_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index daily_plan_items_plan_idx on it.daily_plan_items (plan_id, sort_order);

create view it.v_daily_plans as
select p.*,
       e.fullname_lo         as employee_name,
       e.position_code,
       d.department_name_lo  as department_name,
       s.role,
       s.unit_code,
       coalesce(i.item_count, 0)    as item_count,
       coalesce(i.done_count, 0)    as done_count,
       coalesce(i.planned_hours, 0) as planned_hours,
       coalesce(i.actual_hours, 0)  as actual_hours
  from it.daily_plans p
  join public.odg_employee e on e.employee_id = p.employee_id
  left join public.odg_department d on d.department_code = e.department_code
  left join it.v_it_staff s on s.employee_id = p.employee_id
  left join lateral (
        select count(*)                                        as item_count,
               count(*) filter (where status = 'done')          as done_count,
               sum(planned_hours)                               as planned_hours,
               sum(coalesce(actual_hours, 0))                   as actual_hours
          from it.daily_plan_items x
         where x.plan_id = p.id
  ) i on true;

create view it.v_daily_plan_items as
select i.*,
       p.employee_id,
       p.plan_date,
       t.ticket_no,
       t.title       as ticket_title,
       tk.title      as task_title,
       pr.name       as project_name
  from it.daily_plan_items i
  join it.daily_plans p on p.id = i.plan_id
  left join it.tickets t  on t.id  = i.ticket_id
  left join it.tasks   tk on tk.id = i.task_id
  left join it.projects pr on pr.id = i.project_id;
