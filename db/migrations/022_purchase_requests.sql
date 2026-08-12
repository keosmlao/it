-- 022_purchase_requests.sql
-- ໃບສະເໜີຊື້ (PR) ຂອງພະແນກ IT + ການອະນຸມັດ 2 ຂັ້ນ
--
-- ໝາຍເຫດ: ERP ມີຕາຕະລາງ public.odg_pm_pr / odg_pm_pr_line ຢູ່ແລ້ວ ແຕ່ຍັງບໍ່ມີຂໍ້ມູນ
-- (0 ແຖວ) ແລະ ເປັນຂອງລະບົບຈັດຊື້. ຕາມກົດຂອງລະບົບນີ້ — ບໍ່ຂຽນລົງ public.* —
-- ຈຶ່ງເກັບໄວ້ໃນ schema it ໂດຍໃຊ້ຊື່ຄໍລຳໃຫ້ກົງກັບ ERP ເພື່ອສົ່ງຕໍ່ພາຍຫຼັງໄດ້ງ່າຍ.

create table it.pr_counters (
  year    integer primary key,
  last_no integer not null default 0
);

create function it.next_pr_no() returns varchar
language plpgsql as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into it.pr_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = it.pr_counters.last_no + 1
  returning last_no into n;

  return 'PR-' || y::text || '-' || lpad(n::text, 3, '0');
end $$;

-- ຂັ້ນຕອນ: draft → submitted → (ຫົວໜ້າ) head_approved → (ຜູ້ຈັດການ) approved
--          → ordered → received | rejected | cancelled
create table it.purchase_requests (
  id                    bigserial primary key,
  pr_no                 varchar(20) not null unique default it.next_pr_no(),
  doc_date              date not null default current_date,
  title                 varchar(200) not null,
  purpose               text,
  requester_employee_id integer not null,
  department_code       varchar(20),
  unit_code             varchar(20),
  need_date             date,
  status                varchar(20) not null default 'draft'
                        check (status in ('draft','submitted','head_approved',
                                          'approved','rejected','cancelled',
                                          'ordered','received')),
  current_level         integer not null default 1,   -- 1 = ຫົວໜ້າ, 2 = ຜູ້ຈັດການ
  reject_reason         text,
  approved_by           integer,
  approved_at           timestamptz,
  po_no                 varchar(30),
  received_at           date,
  linked_request_id     bigint references it.requests(id),
  created_by            integer not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index purchase_requests_status_idx
  on it.purchase_requests (status) where deleted_at is null;
create index purchase_requests_requester_idx
  on it.purchase_requests (requester_employee_id, doc_date desc);

create table it.purchase_request_lines (
  id         bigserial primary key,
  pr_id      bigint not null references it.purchase_requests(id) on delete cascade,
  line_no    integer not null,
  item_code  varchar(30),
  item_name  varchar(200) not null,
  spec       text,
  unit       varchar(30),
  qty        numeric(14,2) not null default 1 check (qty > 0),
  est_price  numeric(16,2),
  note       varchar(200),
  unique (pr_id, line_no)
);

create index purchase_request_lines_pr_idx on it.purchase_request_lines (pr_id, line_no);

create table it.pr_approvals (
  id                   bigserial primary key,
  pr_id                bigint not null references it.purchase_requests(id) on delete cascade,
  level                integer not null check (level in (1, 2)),
  approver_employee_id integer not null,
  decision             varchar(10) not null check (decision in ('approved','rejected')),
  note                 text,
  decided_at           timestamptz not null default now()
);

create index pr_approvals_pr_idx on it.pr_approvals (pr_id, level);

create view it.v_purchase_requests as
select p.*,
       req.fullname_lo         as requester_name,
       reqd.department_name_lo as department_name,
       u.unit_name_lo,
       app.fullname_lo         as approved_by_name,
       p.status in ('approved','rejected','cancelled','ordered','received')
                               as is_finished,
       coalesce(l.line_count, 0)  as line_count,
       coalesce(l.total_est, 0)   as total_est,
       (select count(*) from it.pr_approvals a where a.pr_id = p.id) as approval_count
  from it.purchase_requests p
  join public.odg_employee req on req.employee_id = p.requester_employee_id
  left join public.odg_department reqd
         on reqd.department_code = coalesce(p.department_code, req.department_code)
  left join public.odg_unit u on u.unit_code = p.unit_code
  left join public.odg_employee app on app.employee_id = p.approved_by
  left join lateral (
        select count(*)                            as line_count,
               sum(qty * coalesce(est_price, 0))   as total_est
          from it.purchase_request_lines x
         where x.pr_id = p.id
  ) l on true
 where p.deleted_at is null;
