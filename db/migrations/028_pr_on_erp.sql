-- 028_pr_on_erp.sql
-- ຮື້ໃບສະເໜີຊື້ໃໝ່ຕາມທີ່ຜູ້ໃຊ້ສັ່ງ:
--   1. ເກັບລົງຕາຕະລາງ PR ຂອງ ERP ໂດຍກົງ (public.odg_pm_pr / odg_pm_pr_line)
--   2. ຂັ້ນຕອນອະນຸມັດ **ຕັ້ງຄ່າເອງໄດ້** ບໍ່ແມ່ນຝັງໄວ້ 2 ຂັ້ນຕາຍຕົວ
--   3. ຊ່ອງຂໍ້ມູນທີ່ ERP ບໍ່ມີ (ຫົວຂໍ້, ເຫດຜົນ, ຜູ້ຂາຍທີ່ສະເໜີ, ສະກຸນເງິນ …)
--      ເກັບເສີມໄວ້ it.pr_extra ໂດຍຜູກກັບ id ຂອງ ERP
--
-- ໝາຍເຫດ: ນີ້ແມ່ນຂໍ້ຍົກເວັ້ນຂອງກົດ "ບໍ່ຂຽນລົງ public.*" — ຜູ້ໃຊ້ສັ່ງເອງ
-- ໂດຍ odg_pm_pr / odg_pm_pr_line ຍັງວ່າງ (0 ແຖວ) ແລະ ເປັນຕາຕະລາງ PR
-- ຂອງໂມດູນຈັດຊື້ຢູ່ແລ້ວ ຈຶ່ງບໍ່ທັບຂໍ້ມູນເກົ່າຂອງໃຜ

-- ---------------------------------------------------------------------------
-- ຂັ້ນຕອນອະນຸມັດ — ຜູ້ຈັດການແກ້ໄດ້ຈາກໜ້າຕັ້ງຄ່າ
-- ---------------------------------------------------------------------------
create table it.pr_approval_steps (
  step_no              integer primary key,
  name_lo              varchar(100) not null,
  -- ຜູ້ອະນຸມັດ: ລະບຸເປັນບົດບາດ ຫຼື ລະບຸຄົນໂດຍກົງ (ຢ່າງໃດຢ່າງໜຶ່ງ)
  approver_role        varchar(20)
                       check (approver_role in ('head', 'manager')),
  approver_employee_id integer,
  -- ຂັ້ນນີ້ໃຊ້ສະເພາະໃບທີ່ມູນຄ່າຕັ້ງແຕ່ເທົ່ານີ້ຂຶ້ນໄປ (0 = ທຸກໃບ)
  min_amount           numeric(16,2) not null default 0,
  is_active            boolean not null default true,
  note                 text,
  check (approver_role is not null or approver_employee_id is not null)
);

-- ຄ່າຕັ້ງຕົ້ນ 2 ຂັ້ນ — ປ່ຽນ/ເພີ່ມ/ລຶບໄດ້ຈາກໜ້າຕັ້ງຄ່າ
insert into it.pr_approval_steps (step_no, name_lo, approver_role, min_amount) values
  (1, 'ຫົວໜ້າໜ່ວຍງານ',   'head',    0),
  (2, 'ຜູ້ຈັດການພະແນກ', 'manager', 0);

-- ---------------------------------------------------------------------------
-- ຂໍ້ມູນເສີມທີ່ຕາຕະລາງ ERP ບໍ່ມີຊ່ອງໃຫ້
-- ---------------------------------------------------------------------------
create table it.pr_extra (
  pr_id               bigint primary key,   -- = public.odg_pm_pr.id
  title               varchar(200) not null,
  purpose             text,
  supplier_suggestion varchar(200),
  currency            varchar(10) not null default 'LAK',
  delivery_place      varchar(200),
  budget_note         varchar(200),
  current_step        integer not null default 1,
  unit_code           varchar(20),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table it.pr_line_extra (
  line_id bigint primary key,               -- = public.odg_pm_pr_line.id
  spec    text
);

create table it.pr_step_approvals (
  id                   bigserial primary key,
  pr_id                bigint not null,     -- = public.odg_pm_pr.id
  step_no              integer not null,
  approver_employee_id integer not null,
  decision             varchar(10) not null
                       check (decision in ('approved', 'rejected')),
  note                 text,
  decided_at           timestamptz not null default now()
);

create index pr_step_approvals_pr_idx on it.pr_step_approvals (pr_id, step_no);

-- ---------------------------------------------------------------------------
-- ມຸມມອງລວມ: ຫົວໃບຈາກ ERP + ຂໍ້ມູນເສີມ + ຍອດລວມ
-- ---------------------------------------------------------------------------
create view it.v_pr as
select p.id,
       p.pr_no,
       p.doc_date,
       p.department_code,
       p.requester_code,
       p.need_date,
       p.note                        as erp_note,
       p.status,
       p.reject_reason,
       p.approved_by                 as approved_by_code,
       p.approved_at,
       p.po_no,
       p.created_by                  as created_by_code,
       p.created_at,
       p.updated_at,

       x.title,
       x.purpose,
       x.supplier_suggestion,
       x.currency,
       x.delivery_place,
       x.budget_note,
       x.current_step,
       x.unit_code,

       req.employee_id               as requester_employee_id,
       req.fullname_lo               as requester_name,
       pos.position_name_lo          as requester_position,
       dep.department_name_lo        as department_name,
       u.unit_name_lo,
       app.fullname_lo               as approved_by_name,
       cre.fullname_lo               as created_by_name,

       p.status in ('approved', 'rejected', 'cancelled', 'ordered', 'received')
                                     as is_finished,
       coalesce(l.line_count, 0)     as line_count,
       coalesce(l.total_est, 0)      as total_est,
       (select count(*) from it.pr_step_approvals a where a.pr_id = p.id)
                                     as approval_count
  from public.odg_pm_pr p
  join it.pr_extra x on x.pr_id = p.id
  left join public.odg_employee req on req.employee_code = p.requester_code
  left join public.odg_position pos on pos.position_code = req.position_code
  left join public.odg_department dep
         on dep.department_code = coalesce(p.department_code, req.department_code)
  left join public.odg_unit u on u.unit_code = x.unit_code
  left join public.odg_employee app on app.employee_code = p.approved_by
  left join public.odg_employee cre on cre.employee_code = p.created_by
  left join lateral (
        select count(*)                          as line_count,
               sum(qty * coalesce(est_price, 0)) as total_est
          from public.odg_pm_pr_line y where y.pr_id = p.id
  ) l on true;

create view it.v_pr_lines as
select l.id,
       l.pr_id,
       l.line_no,
       l.item_code,
       l.item_name,
       l.unit,
       l.qty,
       l.est_price,
       l.note,
       e.spec,
       l.qty * coalesce(l.est_price, 0) as line_total
  from public.odg_pm_pr_line l
  left join it.pr_line_extra e on e.line_id = l.id;
