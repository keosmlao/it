-- 035_asset_deployments.sql
-- ອຸປະກອນສ່ວນກາງ: switch, hub, access point, ອຸປະກອນຫ້ອງປະຊຸມ ແລະ ອື່ນໆ
--
-- ບັນຫາ: ແບບຈຳລອງເກົ່າມີ 2 ສະຖານະເທົ່ານັ້ນ — ຢູ່ໃນສາງ ຫຼື ຢູ່ກັບຄົນ.
-- ອຸປະກອນສ່ວນກາງບໍ່ມີ "ຜູ້ຖືຄອງ" ເປັນຄົນ ຈຶ່ງຖືກນັບເປັນ "ຫວ່າງ" ຕະຫຼອດ
-- ແລ້ວປະກົດຢູ່ລາຍການທີ່ໃຫ້ຢືມໄດ້ ທັງທີ່ຕິດຕັ້ງໃຊ້ງານຢູ່ແທ້.
--
-- ວິທີແກ້: ເພີ່ມໂໝດທີສາມ "ຕິດຕັ້ງໃຊ້ງານສ່ວນກາງ" ທີ່ຜູກກັບ**ສະຖານທີ່**
-- ບໍ່ແມ່ນຜູກກັບຄົນ ແຕ່ຍັງລະບຸຜູ້ຮັບຜິດຊອບໄດ້ (ຖ້າມີ)

create table it.asset_deployments (
  id             bigserial primary key,
  asset_code     varchar(40) not null,

  -- ຕິດຕັ້ງຢູ່ໃສ
  location_code  varchar(25),          -- ອ້າງ public.as_asset_location ຖ້າມີ
  place          varchar(200) not null, -- ເຊັ່ນ "ຫ້ອງປະຊຸມໃຫຍ່ ຊັ້ນ 3"
  purpose        varchar(200),          -- ເຊັ່ນ "ກະຈາຍສັນຍານຊັ້ນ 3"

  -- ໃຜດູແລ (ບໍ່ແມ່ນຜູ້ຢືມ — ເປັນຜູ້ຮັບຜິດຊອບ)
  responsible_emp_code varchar(20),

  installed_at   date not null default current_date,
  removed_at     date,
  remove_note    text,
  note           text,

  created_by     integer not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  check (removed_at is null or removed_at >= installed_at)
);

-- 1 ເຄື່ອງ ຕິດຕັ້ງຢູ່ບ່ອນດຽວໃນເວລາດຽວກັນ
create unique index asset_deployments_active_idx
  on it.asset_deployments (asset_code) where removed_at is null;

create index asset_deployments_place_idx
  on it.asset_deployments (place) where removed_at is null;

-- ---------------------------------------------------------------------------
-- ອຸປະກອນສ່ວນກາງທີ່ຕິດຕັ້ງຢູ່ປັດຈຸບັນ
-- ---------------------------------------------------------------------------
create view it.v_asset_deployments as
select d.id,
       d.asset_code,
       a.name                     as asset_name,
       a.category_name,
       a.brand,
       a.model,
       a.serial_no,
       a.mac_address,
       d.location_code,
       loc.name_1                 as location_name,
       d.place,
       d.purpose,
       d.responsible_emp_code,
       emp.fullname_lo            as responsible_name,
       dep.department_name_lo     as responsible_department,
       d.installed_at,
       (current_date - d.installed_at) as days_installed,
       d.removed_at,
       d.remove_note,
       d.note,
       cb.fullname_lo             as created_by_name,
       d.created_at,
       s.stock_state,
       a.warranty_status,
       a.warranty_until
  from it.asset_deployments d
  join it.v_it_assets a on a.asset_code = d.asset_code
  left join public.as_asset_location loc on loc.code = d.location_code
  left join public.odg_employee emp on emp.employee_code = d.responsible_emp_code
  left join public.odg_department dep on dep.department_code = emp.department_code
  left join public.odg_employee cb on cb.employee_id = d.created_by
  left join it.asset_stock_status s on s.asset_code = d.asset_code;
