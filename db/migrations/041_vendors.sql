-- 041_vendors.sql
-- ທະບຽນຜູ້ຂາຍ / ຜູ້ໃຫ້ບໍລິການ
--
-- ເຫດຜົນ: ຊື່ຜູ້ຂາຍກະຈາຍຢູ່ 3 ບ່ອນເປັນ text ລ້ວນ —
--   it.subscriptions.vendor · it.asset_repairs.vendor · ໃບສະເໜີຊື້ (ຂອງ ERP)
-- ຂຽນຄົນລະແບບກໍກາຍເປັນຄົນລະເຈົ້າ ("ETL", "etl", "ETL ສາຂາໃຫຍ່") ຈຶ່ງ
-- ລວມຍອດບໍ່ໄດ້ ແລະ ບໍ່ມີບ່ອນເກັບເບີຜູ້ຕິດຕໍ່ ຫຼື ເງື່ອນໄຂການຮັບປະກັນ
--
-- ຜູ້ຂາຍຂອງ ERP (public.ap_supplier) ຍັງໃຊ້ຢູ່ໃນໃບສະເໜີຊື້ຄືເກົ່າ —
-- ຕາຕະລາງນີ້ເປັນ "ສະໝຸດຜູ້ຕິດຕໍ່ຂອງພະແນກ IT" ບໍ່ແມ່ນທະບຽນເຈົ້າໜີ້
-- ຜູກກັນໄດ້ຜ່ານ erp_supplier_code ຖ້າເປັນເຈົ້າດຽວກັນ

create table if not exists it.vendors (
  id                bigserial primary key,
  name              varchar(150) not null,
  short_name        varchar(60),
  erp_supplier_code varchar(25),
  contact_name      varchar(120),
  phone             varchar(60),
  email             varchar(150),
  website           varchar(300),
  address           varchar(300),
  -- ຊ່ອງທາງແຈ້ງບັນຫາ ແລະ ຄຳໝັ້ນສັນຍາເລື່ອງເວລາ — ສິ່ງທີ່ຕ້ອງເປີດຫາຕອນລະບົບລົ້ມ
  support_phone     varchar(60),
  support_email     varchar(150),
  support_hours     varchar(120),
  sla_note          varchar(300),
  note              text,
  is_active         boolean not null default true,
  created_by        integer not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists vendors_name_idx on it.vendors (lower(name));

-- ຜູກສັນຍາເຊົ່າ ແລະ ໃບສ້ອມເຂົ້າກັບທະບຽນ (ຍັງເກັບ text ເກົ່າໄວ້
-- ເພື່ອບໍ່ໃຫ້ຂໍ້ມູນທີ່ປ້ອນມາກ່ອນຫາຍ — ຄ່ອຍໆຍ້າຍໄປໃສ່ id ພາຍຫຼັງ)
alter table it.subscriptions  add column if not exists vendor_id bigint references it.vendors(id);
alter table it.asset_repairs  add column if not exists vendor_id bigint references it.vendors(id);

create index if not exists subscriptions_vendor_idx on it.subscriptions (vendor_id);
create index if not exists asset_repairs_vendor_idx on it.asset_repairs (vendor_id);

-- ຕໍ່ 2 ຄໍລຳໃສ່ທ້າຍ v_subscriptions ໃຫ້ໜ້າຈໍລິ້ງໄປຫາທະບຽນຜູ້ຂາຍໄດ້
-- `create or replace view` ຕໍ່ທ້າຍໄດ້ຢ່າງດຽວ — ແຊກກາງ ຫຼື ປ່ຽນລຳດັບຈະລົ້ມ
create or replace view it.v_subscriptions as
select s.id,
       s.code,
       s.category,
       s.service_name,
       s.vendor,
       s.plan_name,
       s.account_ref,
       s.admin_url,
       s.billing_cycle,
       s.amount,
       s.currency,
       s.start_date,
       s.end_date,
       s.next_due_date,
       s.auto_renew,
       s.owner_employee_id,
       owner.fullname_lo                                as owner_name,
       owner.nickname                                   as owner_nickname,
       s.department_code,
       dep.name_1                                       as department_name,
       s.status,
       s.cancelled_at,
       s.cancel_reason,
       s.note,
       s.created_by,
       creator.fullname_lo                              as created_by_name,
       s.created_at,
       s.updated_at,
       case s.billing_cycle
         when 'monthly'   then s.amount
         when 'quarterly' then round(s.amount / 3, 2)
         when 'yearly'    then round(s.amount / 12, 2)
         else 0::numeric
       end                                              as monthly_amount,
       case s.billing_cycle
         when 'monthly'   then s.amount * 12
         when 'quarterly' then s.amount * 4
         when 'yearly'    then s.amount
         else 0::numeric
       end                                              as yearly_amount,
       case when s.next_due_date is null then null
            else s.next_due_date - current_date end     as days_to_due,
       case
         when s.status <> 'active'                  then 'inactive'
         when s.next_due_date is null               then 'unknown'
         when s.next_due_date < current_date        then 'overdue'
         when s.next_due_date <= current_date + 30  then 'due_soon'
         else 'ok'
       end                                              as due_status,
       coalesce(p.period_count, 0)                      as period_count,
       coalesce(p.unpaid_count, 0)                      as unpaid_count,
       coalesce(p.paid_total, 0)                        as paid_total,
       p.last_paid_at,
       s.vendor_id,
       ven.name                                         as vendor_name
  from it.subscriptions s
  left join public.odg_employee owner   on owner.employee_id   = s.owner_employee_id
  left join public.odg_employee creator on creator.employee_id = s.created_by
  left join public.erp_department_list dep on dep.code::text = s.department_code::text
  left join it.vendors ven on ven.id = s.vendor_id
  left join (
    select subscription_id,
           count(*)                                               as period_count,
           count(*) filter (where status = 'unpaid')              as unpaid_count,
           coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_total,
           max(paid_at) filter (where status = 'paid')            as last_paid_at
      from it.subscription_periods
     group by subscription_id
  ) p on p.subscription_id = s.id;

-- ຄ່າໃຊ້ຈ່າຍຕໍ່ຜູ້ຂາຍ ແຍກຕາມສະກຸນ (ບໍ່ແປງສະກຸນ ດ້ວຍເຫດຜົນດຽວກັບ 040)
create or replace view it.v_vendor_spend as
select v.id                                as vendor_id,
       s.currency,
       count(*)                            as subscription_count,
       sum(s.amount)                       as amount_per_cycle,
       sum(case s.billing_cycle
             when 'monthly'   then s.amount * 12
             when 'quarterly' then s.amount * 4
             when 'yearly'    then s.amount
             else 0::numeric
           end)                            as yearly_amount
  from it.vendors v
  join it.subscriptions s on s.vendor_id = v.id and s.status = 'active'
 group by v.id, s.currency;

create or replace view it.v_vendors as
select v.id,
       v.name,
       v.short_name,
       v.erp_supplier_code,
       v.contact_name,
       v.phone,
       v.email,
       v.website,
       v.address,
       v.support_phone,
       v.support_email,
       v.support_hours,
       v.sla_note,
       v.note,
       v.is_active,
       v.created_by,
       e.fullname_lo                                     as created_by_name,
       v.created_at,
       v.updated_at,
       coalesce(sub.total, 0)                            as subscription_count,
       coalesce(rep.total, 0)                            as repair_count,
       coalesce(rep.cost, 0)                             as repair_cost,
       sup.name_1                                        as erp_supplier_name
  from it.vendors v
  left join public.odg_employee e on e.employee_id = v.created_by
  left join public.ap_supplier sup on sup.code::text = v.erp_supplier_code::text
  left join (select vendor_id, count(*) as total
               from it.subscriptions
              where vendor_id is not null and status = 'active'
              group by vendor_id) sub on sub.vendor_id = v.id
  left join (select vendor_id, count(*) as total, coalesce(sum(cost), 0) as cost
               from it.asset_repairs
              where vendor_id is not null and deleted_at is null
              group by vendor_id) rep on rep.vendor_id = v.id;
