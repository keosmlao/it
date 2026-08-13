-- 032_asset_transfers.sql
-- ໂອນເຄື່ອງຈາກຜູ້ຖືຄົນໜຶ່ງໄປອີກຄົນໜຶ່ງ ໂດຍບໍ່ຕ້ອງຄືນເຂົ້າສາງກ່ອນ
--
-- ເມື່ອກ່ອນລະບົບມີແຕ່ "ຢືມ" ກັບ "ຄືນ" — ຄົນທີ່ຢາກສົ່ງເຄື່ອງຕໍ່ໃຫ້ເພື່ອນ
-- ຈຶ່ງອອກໃບຢືມໃໝ່ໂດຍບໍ່ໄດ້ປິດໃບເກົ່າ ເປັນເຫດໃຫ້ເກີດໃບຢືມຄ້າງຊ້ອນກັນ
-- (ກວດພົບ 12 ເຄື່ອງ ອັນໜຶ່ງເຖິງ 4 ໃບ).
--
-- ການໂອນ 1 ຄັ້ງ = ປິດໃບເກົ່າ + ເປີດໃບໃໝ່ ພາຍໃນ transaction ດຽວ
-- ຕາຕະລາງນີ້ຜູກສອງໃບນັ້ນເຂົ້ານຳກັນ ເພື່ອໃຫ້ປະຫວັດອ່ານອອກວ່າ "ໂອນ"
-- ບໍ່ແມ່ນ "ຄືນແລ້ວມີຄົນຢືມໃໝ່ບັງເອີນ"

create table it.asset_transfers (
  id             bigserial primary key,
  asset_code     varchar(40) not null,

  from_emp_code  varchar(20) not null,
  to_emp_code    varchar(20) not null,
  transferred_at date not null default current_date,

  -- ໃບຢືມເກົ່າທີ່ຖືກປິດ ແລະ ໃບຄືນທີ່ອອກໃຫ້ມັນ
  from_borrow_doc_no varchar(30),
  from_return_doc_no varchar(30),
  -- ໃບຢືມໃໝ່ຂອງຜູ້ຮັບ
  to_borrow_doc_no   varchar(30) not null,

  condition      varchar(20) not null default 'good'
                 check (condition in ('good', 'damaged')),
  note           text,
  created_by     integer not null,
  created_at     timestamptz not null default now(),

  check (from_emp_code <> to_emp_code)
);

create index asset_transfers_asset_idx
  on it.asset_transfers (asset_code, transferred_at desc);

create view it.v_asset_transfers as
select t.*,
       a.name_1                as asset_name,
       fe.fullname_lo          as from_name,
       fd.department_name_lo   as from_department,
       te.fullname_lo          as to_name,
       td.department_name_lo   as to_department,
       cb.fullname_lo          as created_by_name
  from it.asset_transfers t
  left join public.as_asset a       on a.code = t.asset_code
  left join public.odg_employee fe  on fe.employee_code = t.from_emp_code
  left join public.odg_department fd on fd.department_code = fe.department_code
  left join public.odg_employee te  on te.employee_code = t.to_emp_code
  left join public.odg_department td on td.department_code = te.department_code
  left join public.odg_employee cb  on cb.employee_id = t.created_by;
