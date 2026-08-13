-- 033_pr_sml_fields.sql
-- ຈັດໃບສະເໜີຊື້ໃຫ້ເປັນເອກະສານແບບ SML
--
-- ເອກະສານຊື້ຂອງ SML ມີສ່ວນທ້າຍບິນຄົບ: ລວມກ່ອນຫຼຸດ → ສ່ວນຫຼຸດ → ຫຼັງຫຼຸດ
-- → ພາສີມູນຄ່າເພີ່ມ → ລວມທັງສິ້ນ ແລະ ຫົວບິນມີຜູ້ຈຳໜ່າຍ (ap_supplier).
-- ລາຍການສິນຄ້າດຶງຈາກ public.ic_inventory (24,538 ລາຍການ) ແທນການພິມເອງ

alter table it.pr_extra
  add column supplier_code   varchar(25),
  add column discount_amount numeric(16,2) not null default 0,
  add column vat_rate        numeric(5,2)  not null default 0,
  add column doc_ref         varchar(30);

-- ສ່ວນຫຼຸດຕໍ່ແຖວ (SML ມີຊ່ອງນີ້ໃນ grid)
alter table it.pr_line_extra
  add column discount numeric(16,2) not null default 0;

-- ---------------------------------------------------------------------------
-- ຄິດຍອດແບບ SML: ລວມແຖວ − ສ່ວນຫຼຸດແຖວ − ສ່ວນຫຼຸດທ້າຍບິນ + VAT
-- ---------------------------------------------------------------------------
drop view it.v_pr_lines;

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
       coalesce(e.discount, 0)                                   as discount,
       l.qty * coalesce(l.est_price, 0)                          as line_gross,
       l.qty * coalesce(l.est_price, 0) - coalesce(e.discount, 0) as line_total,
       -- ຂໍ້ມູນສິນຄ້າຈາກທະບຽນ ERP (ຖ້າເລືອກມາຈາກ ic_inventory)
       inv.name_1                                                as inventory_name,
       inv.unit_standard                                         as inventory_unit,
       inv.balance_qty                                           as stock_qty,
       inv.average_cost                                          as stock_cost
  from public.odg_pm_pr_line l
  left join it.pr_line_extra e on e.line_id = l.id
  left join public.ic_inventory inv on inv.code = l.item_code;

drop view it.v_pr;

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
       x.supplier_code,
       x.currency,
       x.delivery_place,
       x.budget_note,
       x.current_step,
       x.unit_code,
       x.discount_amount,
       x.vat_rate,
       x.doc_ref,

       sup.name_1                    as supplier_name,
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
       coalesce(l.total_gross, 0)    as total_gross,
       coalesce(l.line_discount, 0)  as line_discount,
       -- ຍອດຕາມລຳດັບຂອງ SML
       coalesce(l.total_est, 0)                                   as total_before_discount,
       coalesce(l.total_est, 0) - x.discount_amount                as total_after_discount,
       round((coalesce(l.total_est, 0) - x.discount_amount)
             * x.vat_rate / 100, 2)                               as vat_amount,
       coalesce(l.total_est, 0) - x.discount_amount
         + round((coalesce(l.total_est, 0) - x.discount_amount)
                 * x.vat_rate / 100, 2)                           as total_est,
       (select count(*) from it.pr_step_approvals a where a.pr_id = p.id)
                                     as approval_count
  from public.odg_pm_pr p
  join it.pr_extra x on x.pr_id = p.id
  left join public.ap_supplier sup on sup.code = x.supplier_code
  left join public.odg_employee req on req.employee_code = p.requester_code
  left join public.odg_position pos on pos.position_code = req.position_code
  left join public.odg_department dep
         on dep.department_code = coalesce(p.department_code, req.department_code)
  left join public.odg_unit u on u.unit_code = x.unit_code
  left join public.odg_employee app on app.employee_code = p.approved_by
  left join public.odg_employee cre on cre.employee_code = p.created_by
  left join lateral (
        select count(*)                                     as line_count,
               sum(y.qty * coalesce(y.est_price, 0))        as total_gross,
               sum(coalesce(e.discount, 0))                 as line_discount,
               sum(y.qty * coalesce(y.est_price, 0)
                   - coalesce(e.discount, 0))               as total_est
          from public.odg_pm_pr_line y
          left join it.pr_line_extra e on e.line_id = y.id
         where y.pr_id = p.id
  ) l on true;

-- ---------------------------------------------------------------------------
-- ສິນຄ້າທີ່ເລືອກໄດ້ — ຫຍໍ້ຈາກ ic_inventory (111 ຄໍລຳ) ໃຫ້ເຫຼືອທີ່ໃຊ້ຈິງ
-- ---------------------------------------------------------------------------
create view it.v_inventory_items as
select i.code,
       i.name_1                                    as name,
       nullif(i.item_model, '')                    as model,
       nullif(i.unit_standard, '')                 as unit_code,
       coalesce(nullif(i.unit_standard_name, ''), i.unit_standard) as unit_name,
       coalesce(i.balance_qty, 0)                  as stock_qty,
       coalesce(i.average_cost, 0)                 as avg_cost,
       nullif(i.item_brand, '')                    as brand_code,
       nullif(i.item_category, '')                 as category_code,
       cat.name_1                                  as category_name
  from public.ic_inventory i
  left join public.ic_category cat on cat.code = i.item_category
 where coalesce(i.status, 0) = 0;
