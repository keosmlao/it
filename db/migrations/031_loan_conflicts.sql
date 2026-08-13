-- 031_loan_conflicts.sql
-- ເປີດເຜີຍ "ເຄື່ອງທີ່ຢືມແລ້ວບໍ່ຄືນ ແຕ່ຖືກໃຫ້ຄົນອື່ນຢືມຕໍ່"
--
-- ພົບຈາກການກວດຂໍ້ມູນຈິງ: 12 ເຄື່ອງມີໃບຢືມຄ້າງພ້ອມກັນຫຼາຍໃບ (ອັນໜຶ່ງເຖິງ 4 ໃບ)
-- ແລະ 54 ຄູ່ທີ່ໃບໃໝ່ອອກກ່ອນໃບເກົ່າຈະຄືນ.
--
-- ບັນຫາຂອງໜ້າຈໍເກົ່າ: it.v_asset_holders ໃຊ້ distinct on (asset_code)
-- ຈຶ່ງເລືອກສະແດງພຽງຜູ້ຖືລ່າສຸດຄົນດຽວ — ຜູ້ຖືອື່ນ 14 ຄົນຖືກເຊື່ອງໄວ້ງຽບໆ
-- ເຮັດໃຫ້ບໍ່ມີໃຜຮູ້ວ່າມີບັນຫາ. View ນີ້ດຶງມັນອອກມາໃຫ້ເຫັນ

create view it.v_loan_conflicts as
select m.asset_code,
       m.asset_name,
       m.category_name,
       m.serial_no,
       m.emp_code,
       m.emp_name,
       m.org_department,
       m.division_name,
       m.is_former_employee,
       m.source,
       m.borrow_doc_no,
       m.borrowed_at,
       m.expected_return,
       (current_date - m.borrowed_at::date)          as days_held,
       cnt.open_count,
       row_number() over (partition by m.asset_code
                          order by m.borrowed_at, m.borrow_doc_no) as seq,
       -- ໃບຫຼ້າສຸດຄືອັນທີ່ໜ້າ "ຜູ້ຖືຄອງ" ສະແດງ ສ່ວນອັນອື່ນຖືກເຊື່ອງ
       row_number() over (partition by m.asset_code
                          order by m.borrowed_at desc,
                                   m.borrow_doc_no desc) = 1 as is_shown_as_holder
  from it.v_asset_movements m
  join (
        select asset_code, count(*) as open_count
          from it.v_asset_movements
         where not is_returned
         group by asset_code
       ) cnt on cnt.asset_code = m.asset_code
 where not m.is_returned
   and cnt.open_count > 1;

-- ວັນທີທີ່ເປັນໄປບໍ່ໄດ້ (ຄືນກ່ອນຢືມ) — ຂໍ້ມູນ ERP ຜິດ ຕ້ອງໃຫ້ຄົນກວດ
create view it.v_loan_date_errors as
select asset_code, asset_name, borrow_doc_no, return_doc_no,
       emp_code, emp_name, org_department, borrowed_at, returned_at
  from it.v_asset_movements
 where returned_at is not null
   and returned_at < borrowed_at;
