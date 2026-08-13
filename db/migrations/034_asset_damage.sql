-- 034_asset_damage.sql
-- ໝາຍອຸປະກອນວ່າ "ເພ" ແລະ ຕັດຈຳໜ່າຍເມື່ອໃຊ້ບໍ່ໄດ້ແລ້ວ
--
-- ເມື່ອກ່ອນ it.asset_stock_status ມີແຕ່ in_stock / with_user / repair /
-- missing / retired — ບໍ່ມີບ່ອນບອກວ່າ "ເພແຕ່ຍັງສ້ອມໄດ້" ແລະ ບໍ່ມີເອກະສານ
-- ຕັດຈຳໜ່າຍ. ເພີ່ມ 2 ສະຖານະ ພ້ອມຕາຕະລາງບັນທຶກການຕັດຈຳໜ່າຍຢ່າງເປັນທາງການ

alter table it.asset_stock_status
  drop constraint asset_stock_status_stock_state_check;

alter table it.asset_stock_status
  add constraint asset_stock_status_stock_state_check
  check (stock_state in ('in_stock', 'with_user', 'repair', 'damaged',
                         'missing', 'scrapped', 'retired'));

-- ວັນທີ່ພົບວ່າເພ (ແຍກຈາກ checked_at ທີ່ເປັນວັນກວດຫຼ້າສຸດ)
alter table it.asset_stock_status
  add column damaged_at date,
  add column damage_detail text;

-- ---------------------------------------------------------------------------
-- ເອກະສານຕັດຈຳໜ່າຍ — ຕ້ອງມີເຫດຜົນ ແລະ ຜູ້ຕັດສິນ ຈຶ່ງກວດຄືນພາຍຫຼັງໄດ້
-- ---------------------------------------------------------------------------
create table it.asset_writeoffs (
  id           bigserial primary key,
  asset_code   varchar(40) not null,
  reason       varchar(30) not null
               check (reason in ('beyond_repair', 'too_costly', 'obsolete',
                                 'lost', 'other')),
  detail       text not null,
  written_off_at date not null default current_date,
  decided_by   integer not null,
  approved_by  integer,
  approved_at  timestamptz,
  book_value   numeric(16,2),
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_note  text
);

-- 1 ເຄື່ອງ ຕັດຈຳໜ່າຍໄດ້ເທື່ອດຽວ (ຈົນກວ່າຈະຍົກເລີກ)
create unique index asset_writeoffs_active_idx
  on it.asset_writeoffs (asset_code) where cancelled_at is null;

create index asset_writeoffs_date_idx
  on it.asset_writeoffs (written_off_at desc);

-- ---------------------------------------------------------------------------
-- ອຸປະກອນທີ່ມີບັນຫາ — ລວມທຸກສະຖານະທີ່ຕ້ອງຕິດຕາມໄວ້ບ່ອນດຽວ
-- ---------------------------------------------------------------------------
create view it.v_damaged_assets as
select a.asset_code,
       a.name                        as asset_name,
       a.category_name,
       a.brand,
       a.model,
       a.serial_no,
       a.location_name,
       a.purchase_date,
       a.purchase_price,
       a.warranty_status,
       a.warranty_until,
       a.is_assigned,
       a.holder_name,
       a.holder_department,

       s.stock_state,
       s.damaged_at,
       s.damage_detail,
       s.location_note,
       s.note                        as check_note,
       s.checked_at,
       chk.fullname_lo               as checked_by_name,

       w.id                          as writeoff_id,
       w.reason                      as writeoff_reason,
       w.detail                      as writeoff_detail,
       w.written_off_at,
       w.book_value,
       dec.fullname_lo               as decided_by_name,
       w.approved_at is not null     as writeoff_approved,
       app.fullname_lo               as approved_by_name,

       coalesce(rp.repair_count, 0)  as repair_count,
       rp.last_repair_at,
       coalesce(rp.repair_cost, 0)   as repair_cost_total
  from it.v_it_assets a
  join it.asset_stock_status s on s.asset_code = a.asset_code
  left join public.odg_employee chk on chk.employee_id = s.checked_by
  left join it.asset_writeoffs w
         on w.asset_code = a.asset_code and w.cancelled_at is null
  left join public.odg_employee dec on dec.employee_id = w.decided_by
  left join public.odg_employee app on app.employee_id = w.approved_by
  left join lateral (
        select count(*)                 as repair_count,
               max(r.repair_date)       as last_repair_at,
               sum(coalesce(r.cost, 0)) as repair_cost
          from it.v_asset_repairs r
         where r.asset_code = a.asset_code
  ) rp on true
 where s.stock_state in ('damaged', 'repair', 'missing', 'scrapped', 'retired');
