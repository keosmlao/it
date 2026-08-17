-- 053_ticket_drop_pending.sql
-- ຕັດສະຖານະ 'pending' ("ລໍຂໍ້ມູນ") ອອກຈາກ ticket
--
-- ເຫດຜົນ: ໃນທາງປະຕິບັດການລໍຂໍ້ມູນຈາກຜູ້ແຈ້ງກໍຍັງເປັນວຽກທີ່ກຳລັງດຳເນີນຢູ່ —
-- ແຍກເປັນສະຖານະຕ່າງຫາກເຮັດໃຫ້ມີຂັ້ນໃຫ້ຄິດເພີ່ມ ໂດຍທີ່ຂັ້ນຕອນຕໍ່ໄປກໍອັນດຽວກັນ
-- ຄວາມຄືບໜ້າແບບ "ລໍຂໍ້ມູນຈາກໃຜ" ບັນທຶກໃນຂໍ້ຄວາມ (it.ticket_comments) ໄດ້ດີກວ່າ
--
-- ແຖວເກົ່າແປງເປັນ 'in_progress' — ລວມແຖວທີ່ລຶບແບບ soft ໄປແລ້ວ ເພາະ
-- constraint ບັງຄັບທຸກແຖວ ບໍ່ວ່າ deleted_at ຈະເປັນຫຍັງ

update it.tickets
   set status = 'in_progress', updated_at = now()
 where status = 'pending';

alter table it.tickets drop constraint if exists tickets_status_check;

alter table it.tickets add constraint tickets_status_check
  check (status in ('new', 'assigned', 'in_progress',
                    'resolved', 'unrepairable', 'closed', 'cancelled'));
