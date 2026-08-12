-- 006_attachments.sql
-- ຮູບແນບ: ຮູບຕອນແຈ້ງບັນຫາ ແລະ ຮູບຫຼັກຖານຕອນແກ້ໄຂແລ້ວ
--
-- ຕົວໄຟລ໌ເກັບໃນ disk (ໂຟນເດີ UPLOAD_DIR) ບໍ່ໄດ້ເກັບໃນ DB
-- ເພື່ອບໍ່ໃຫ້ຖານຂໍ້ມູນທີ່ໃຊ້ຮ່ວມກັບແອັບອື່ນໃຫຍ່ຂຶ້ນ.

create table it.attachments (
  id            bigserial primary key,
  ticket_id     bigint not null references it.tickets(id) on delete cascade,
  kind          varchar(20) not null
                check (kind in ('report', 'evidence')),
  file_name     varchar(255) not null,   -- ຊື່ເດີມທີ່ຜູ້ໃຊ້ອັບໂຫລດ
  stored_name   varchar(120) not null,   -- ຊື່ໃນ disk (ສຸ່ມ)
  mime_type     varchar(100) not null,
  size_bytes    integer not null,
  uploaded_by   integer not null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index attachments_ticket_idx
  on it.attachments (ticket_id, kind, created_at)
  where deleted_at is null;

create view it.v_attachments as
select a.id, a.ticket_id, a.kind, a.file_name, a.stored_name,
       a.mime_type, a.size_bytes, a.uploaded_by, a.created_at,
       e.fullname_lo as uploaded_by_name,
       e.nickname    as uploaded_by_nickname
  from it.attachments a
  join public.odg_employee e on e.employee_id = a.uploaded_by
 where a.deleted_at is null;
