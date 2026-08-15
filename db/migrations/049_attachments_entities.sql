-- 049_attachments_entities.sql
-- ໄຟລ໌ແນບໃຊ້ໄດ້ທົ່ວລະບົບ ບໍ່ແມ່ນສະເພາະ ticket
--
-- ເຫດຜົນ: it.attachments ບັງຄັບ `ticket_id not null` ມາແຕ່ຕົ້ນ ຈຶ່ງແນບບໍ່ໄດ້ເລີຍກັບ
--   · ໃບສັນຍາເຊົ່າ ແລະ ໃບບິນແຕ່ລະງວດ
--   · ໃບຮັບປະກັນ / ໃບຊື້ຂອງອຸປະກອນ
--   · ຮູບຫຼັກຖານຕອນເກີດເຫດຂັດຂ້ອງ
--   · ໃບສະເໜີລາຄາຂອງຜູ້ຂາຍ
-- ຂໍ້ມູນຢູ່ໃນລະບົບແລ້ວ ແຕ່ເອກະສານຈິງຍັງກະຈາຍຢູ່ Drive ແລະ ຕູ້ເຈ້ຍ
--
-- ວິທີ: ເພີ່ມ (entity_type, entity_id) ແລ້ວຍ້າຍແຖວເກົ່າມາເປັນ entity_type='ticket'
-- `ticket_id` ຍັງຢູ່ຄືເກົ່າ (ບໍ່ບັງຄັບແລ້ວ) ຈຶ່ງ FK ກັບຂອບເຂດການເບິ່ງເຫັນ ticket
-- ຍັງເຮັດວຽກຄືເກົ່າທຸກຢ່າງ — ໂຄ້ດເກົ່າບໍ່ຕ້ອງແກ້

alter table it.attachments
  add column if not exists entity_type varchar(20),
  add column if not exists entity_id   varchar(40);

-- ຍ້າຍຂອງເກົ່າ: ທຸກແຖວທີ່ມີຢູ່ແມ່ນຂອງ ticket ທັງໝົດ
update it.attachments
   set entity_type = 'ticket', entity_id = ticket_id::text
 where entity_type is null;

alter table it.attachments alter column ticket_id   drop not null;
alter table it.attachments alter column entity_type set not null;
alter table it.attachments alter column entity_id   set not null;

-- ເອກະສານທົ່ວໄປໃຊ້ kind = 'document' (ticket ຍັງໃຊ້ report/evidence ຄືເກົ່າ)
alter table it.attachments drop constraint if exists attachments_kind_check;
alter table it.attachments add constraint attachments_kind_check
  check (kind in ('report', 'evidence', 'document'));

alter table it.attachments drop constraint if exists attachments_entity_check;
alter table it.attachments add constraint attachments_entity_check
  check (entity_type in ('ticket', 'subscription', 'asset', 'incident', 'vendor'));

-- ແຖວຂອງ ticket ຕ້ອງມີ ticket_id ສະເໝີ ແລະ ແຖວອື່ນຕ້ອງບໍ່ມີ —
-- ກັນຂໍ້ມູນສອງແບບປົນກັນຈົນຂອບເຂດການເບິ່ງເຫັນເພ
alter table it.attachments drop constraint if exists attachments_ticket_link;
alter table it.attachments add constraint attachments_ticket_link
  check ((entity_type = 'ticket') = (ticket_id is not null));

create index if not exists attachments_entity_idx
  on it.attachments (entity_type, entity_id, created_at)
  where deleted_at is null;

-- ຕໍ່ 2 ຄໍລຳໃສ່ທ້າຍ view — ຕໍ່ທ້າຍໄດ້ຢ່າງດຽວ ແຊກກາງບໍ່ໄດ້
create or replace view it.v_attachments as
select a.id, a.ticket_id, a.kind, a.file_name, a.stored_name,
       a.mime_type, a.size_bytes, a.uploaded_by, a.created_at,
       e.fullname_lo as uploaded_by_name,
       e.nickname    as uploaded_by_nickname,
       a.entity_type,
       a.entity_id
  from it.attachments a
  join public.odg_employee e on e.employee_id = a.uploaded_by
 where a.deleted_at is null;
