-- 027_erp_data_fixes.sql
-- ບັນທຶກການແກ້ຂໍ້ມູນທີ່ຜິດໃນ ERP (public.*) ໄວ້ໃນ schema it
--
-- ໂດຍປົກກະຕິລະບົບນີ້ອ່ານ ERP ຢ່າງດຽວ. ແຕ່ບາງແຖວຂໍ້ມູນຜິດແທ້ (ເຊັ່ນ
-- ອຸປະກອນໄອທີລະຫັດ 200-… ຖືກຈັດເປັນປະເພດ 400 = ເຄື່ອງເຮືອນ) ເຊິ່ງ
-- ຜູ້ໃຊ້ສັ່ງໃຫ້ແກ້. ທຸກການແກ້ຕ້ອງບັນທຶກຄ່າເກົ່າໄວ້ຢູ່ນີ້ກ່ອນ
-- ຈຶ່ງຍ້ອນກັບຄືນໄດ້ຖ້າພາຍຫຼັງພົບວ່າແກ້ຜິດ

create table it.erp_data_fixes (
  id          bigserial primary key,
  table_name  varchar(60) not null,
  key_column  varchar(60) not null,
  key_value   varchar(60) not null,
  column_name varchar(60) not null,
  old_value   text,
  new_value   text,
  reason      text,
  applied_by  integer,
  applied_at  timestamptz not null default now(),
  reverted_at timestamptz
);

create index erp_data_fixes_key_idx
  on it.erp_data_fixes (table_name, key_value, applied_at desc);
