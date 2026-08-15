-- 047_budget.sql
-- ງົບປະມານປະຈຳປີ ທຽບ ໃຊ້ຈິງ
--
-- ເຫດຜົນ: ຕົວເລກ "ໃຊ້ຈິງ" ມີຢູ່ໃນລະບົບຄົບແລ້ວ (ໃບສະເໜີຊື້, ຄ່າເຊົ່າ, ຄ່າສ້ອມ,
-- ຂອງສິ້ນເປືອງ) ແຕ່ບໍ່ມີ "ເສັ້ນງົບປະມານ" ໃຫ້ທຽບ ຈຶ່ງຕອບຜູ້ບໍລິຫານບໍ່ໄດ້ວ່າ
-- ໃຊ້ໄປແລ້ວກີ່ສ່ວນຮ້ອຍ ແລະ ຈະພໍຮອດທ້າຍປີບໍ
--
-- ແຕ່ລະເສັ້ນບອກວ່າ "ໃຊ້ຈິງ" ໃຫ້ໄປອ່ານຈາກໃສ (`source`) ຈຶ່ງບໍ່ຕ້ອງມາປ້ອນ
-- ຕົວເລກຄ່າໃຊ້ຈ່າຍຊໍ້າອີກເທື່ອ — ປ້ອນເອງໄດ້ສະເພາະເສັ້ນ `manual`
--
-- ⚠️ ຮອດແຕ່ລະສະກຸນເງິນຕ້ອງແຍກເສັ້ນ — ບໍ່ແປງອັດຕາແລກປ່ຽນ (ຄືກັບ 040)

create table if not exists it.budget_lines (
  id             bigserial primary key,
  fiscal_year    integer not null check (fiscal_year between 2000 and 2100),
  name           varchar(150) not null,
  category       varchar(20) not null default 'other'
                 check (category in ('asset','subscription','repair','consumable',
                                     'project','training','other')),
  -- ໃຊ້ຈິງມາຈາກໃສ: manual = ປ້ອນເອງໃນ it.budget_spends
  source         varchar(20) not null default 'manual'
                 check (source in ('manual','subscriptions','purchase','repairs',
                                   'consumables')),
  -- ຕົວກັ່ນເພີ່ມ: ສຳລັບ subscriptions ໃສ່ໝວດ (internet/cloud/ai…) ໄດ້
  source_filter  varchar(20),
  currency       varchar(3) not null default 'LAK'
                 check (currency in ('LAK','THB','USD','CNY')),
  planned_amount numeric(16,2) not null default 0 check (planned_amount >= 0),
  note           varchar(300),
  created_by     integer not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists budget_lines_unique_idx
  on it.budget_lines (fiscal_year, lower(name), currency);
create index if not exists budget_lines_year_idx
  on it.budget_lines (fiscal_year);

create table if not exists it.budget_spends (
  id          bigserial primary key,
  line_id     bigint not null references it.budget_lines(id) on delete cascade,
  spend_date  date not null default current_date,
  amount      numeric(16,2) not null check (amount >= 0),
  description varchar(200) not null,
  ref_no      varchar(60),
  created_by  integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists budget_spends_line_idx
  on it.budget_spends (line_id, spend_date desc);

create or replace view it.v_budget_lines as
select b.id,
       b.fiscal_year,
       b.name,
       b.category,
       b.source,
       b.source_filter,
       b.currency,
       b.planned_amount,
       b.note,
       b.created_by,
       e.fullname_lo                                  as created_by_name,
       b.created_at,
       b.updated_at,
       actual.amount                                  as actual_amount,
       b.planned_amount - actual.amount               as remaining_amount,
       case when b.planned_amount = 0 then null
            else round(actual.amount * 100 / b.planned_amount)::integer
       end                                            as percent_used,
       case
         when b.planned_amount = 0                        then 'unset'
         when actual.amount > b.planned_amount            then 'over'
         when actual.amount >= b.planned_amount * 0.9     then 'near'
         else 'ok'
       end                                            as budget_state
  from it.budget_lines b
  left join public.odg_employee e on e.employee_id = b.created_by
  cross join lateral (
    select coalesce(
      case b.source

        -- ປ້ອນເອງ
        when 'manual' then
          (select sum(s.amount) from it.budget_spends s where s.line_id = b.id)

        -- ງວດຄ່າເຊົ່າທີ່ຈ່າຍແລ້ວໃນປີນັ້ນ (ບໍ່ແມ່ນຄ່າໃນສັນຍາ — ຈ່າຍຈິງເທົ່າໃດ)
        when 'subscriptions' then
          (select sum(p.amount)
             from it.subscription_periods p
             join it.subscriptions s on s.id = p.subscription_id
            where p.status = 'paid'
              and p.currency::text = b.currency::text
              and extract(year from p.paid_at) = b.fiscal_year
              and (b.source_filter is null
                   or s.category::text = b.source_filter::text))

        -- ໃບສະເໜີຊື້ທີ່ຜ່ານການອະນຸມັດຂຶ້ນໄປ
        when 'purchase' then
          (select sum(pr.total_est)
             from it.v_pr pr
            where pr.status in ('approved','ordered','received')
              and pr.currency::text = b.currency::text
              and extract(year from pr.doc_date) = b.fiscal_year)

        -- ຄ່າສ້ອມແປງ (ລວມທັງທີ່ບັນທຶກໃນ ERP)
        when 'repairs' then
          (select sum(r.cost)
             from it.v_asset_repairs r
            where r.status <> 'cancelled'
              and extract(year from r.repair_date) = b.fiscal_year)

        -- ມູນຄ່າຂອງສິ້ນເປືອງທີ່ຮັບເຂົ້າໃນປີນັ້ນ
        when 'consumables' then
          (select sum(m.qty * coalesce(c.unit_price, 0))
             from it.consumable_moves m
             join it.consumables c on c.id = m.consumable_id
            where m.kind = 'in'
              and extract(year from m.moved_at) = b.fiscal_year)
      end, 0) as amount
  ) actual;

create or replace view it.v_budget_spends as
select s.id,
       s.line_id,
       b.name                     as line_name,
       b.fiscal_year,
       b.currency,
       s.spend_date,
       s.amount,
       s.description,
       s.ref_no,
       s.created_by,
       e.fullname_lo              as created_by_name,
       s.created_at
  from it.budget_spends s
  join it.budget_lines b on b.id = s.line_id
  left join public.odg_employee e on e.employee_id = s.created_by;
