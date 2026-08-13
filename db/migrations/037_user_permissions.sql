-- 037_user_permissions.sql
-- ກຳນົດສິດລາຍຄົນ — ທັບເທິງສິດທີ່ມາຈາກບົດບາດ
--
-- ເຫດຜົນ: ດຽວນີ້ສິດຜູກກັບບົດບາດຢ່າງດຽວ. ຖ້າຢາກໃຫ້ພະນັກງານຄົນໜຶ່ງ
-- ອະນຸມັດໄດ້ ຕ້ອງຍົກເປັນ 'head' ທັງກ້ອນ ຊຶ່ງເປີດສິດອື່ນຕິດມາໝົດ.
-- ຕາຕະລາງນີ້ໃຫ້ເປີດ/ປິດເປັນລາຍຂໍ້ໄດ້ ໂດຍບໍ່ຕ້ອງແຕະບົດບາດ.
--
-- ບໍ່ມີແຖວ = ຕາມບົດບາດ · allowed=true = ເປີດໃຫ້ · allowed=false = ຫ້າມ
-- (ຫ້າມໄດ້ແມ້ບົດບາດຈະເປີດໃຫ້ — ໃຊ້ຕອນຢາກຈຳກັດຄົນໃດຄົນໜຶ່ງ)

create table if not exists it.user_permissions (
  employee_id integer     not null,
  permission  varchar(40) not null,
  allowed     boolean     not null,
  note        varchar(200),
  updated_by  integer     not null,
  updated_at  timestamptz not null default now(),
  primary key (employee_id, permission)
);

create index if not exists user_permissions_employee_idx
  on it.user_permissions (employee_id);

create or replace view it.v_user_permissions as
  select p.employee_id,
         p.permission,
         p.allowed,
         p.note,
         p.updated_by,
         u.fullname_lo as updated_by_name,
         p.updated_at,
         e.fullname_lo   as employee_name,
         e.employee_code
    from it.user_permissions p
    join public.odg_employee e on e.employee_id = p.employee_id
    left join public.odg_employee u on u.employee_id = p.updated_by;
