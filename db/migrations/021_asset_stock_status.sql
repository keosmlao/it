-- 021_asset_stock_status.sql
-- ໃຫ້ພະແນກ IT ໝາຍສະຖານະຈິງຂອງອຸປະກອນເອງ ແລະ ຕິດຕາມການທວງຄືນ
--
-- ເຫດຜົນ:
--   • ERP ບໍ່ມີຊ່ອງ "ຢູ່ໃນສາງ" — ບອກໄດ້ພຽງສະຖານທີ່ຕັ້ງ ເຊິ່ງ 45 ເຄື່ອງບໍ່ໄດ້ລະບຸ
--   • 146 ເຄື່ອງບໍ່ເຄີຍມີໃບຢືມ ອາດຢູ່ກັບຄົນແລ້ວແຕ່ບໍ່ມີເອກະສານ
--   • 23 ຄົນອອກໄປແລ້ວ ຍັງຄ້າງເຄື່ອງ 34 ອັນ ຕ້ອງມີບ່ອນບັນທຶກການທວງ

create table it.asset_stock_status (
  asset_code   varchar(40) primary key,
  stock_state  varchar(20) not null
               check (stock_state in ('in_stock', 'with_user', 'repair',
                                      'missing', 'retired')),
  location_note varchar(200),
  checked_at   date not null default current_date,
  checked_by   integer not null,
  note         text,
  updated_at   timestamptz not null default now()
);

-- ການທວງຄືນອຸປະກອນ (ໃຊ້ກັບຄົນທີ່ອອກໄປແລ້ວ ຫຼື ຄ້າງດົນ)
create table it.asset_recoveries (
  id            bigserial primary key,
  asset_code    varchar(40) not null,
  emp_code      varchar(20) not null,
  status        varchar(20) not null default 'open'
                check (status in ('open', 'contacted', 'promised',
                                  'recovered', 'written_off')),
  contacted_at  date,
  promised_date date,
  closed_at     date,
  note          text,
  created_by    integer not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index asset_recoveries_open_idx
  on it.asset_recoveries (asset_code, emp_code)
  where status not in ('recovered', 'written_off');

create index asset_recoveries_status_idx on it.asset_recoveries (status);

-- ລາຍການທີ່ຕ້ອງທວງຄືນ: ຄົນທີ່ອອກໄປແລ້ວ ຫຼື ຢືມດົນເກີນ 1 ປີ
create view it.v_recovery_targets as
select m.asset_code,
       m.asset_name,
       m.emp_code,
       m.emp_name,
       m.org_department,
       m.division_name,
       m.borrow_doc_no,
       m.borrowed_at,
       m.is_former_employee,
       m.source,
       (current_date - m.borrowed_at::date)      as days_held,
       r.id                                      as recovery_id,
       r.status                                  as recovery_status,
       r.contacted_at,
       r.promised_date,
       r.note                                    as recovery_note,
       case
         when m.is_former_employee then 'former'
         when m.borrowed_at::date < current_date - 365 then 'long_held'
         else 'normal'
       end                                       as reason
  from it.v_asset_movements m
  left join it.asset_recoveries r
         on r.asset_code = m.asset_code
        and r.emp_code   = m.emp_code
        and r.status not in ('recovered', 'written_off')
 where not m.is_returned
   and (m.is_former_employee or m.borrowed_at::date < current_date - 365);
