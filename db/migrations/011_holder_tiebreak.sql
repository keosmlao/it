-- 011_holder_tiebreak.sql
-- ຜູ້ຖືຄອງປັດຈຸບັນ: ເພີ່ມເລກໃບຢືມເປັນຕົວຕັດສິນ
--
-- ຫຼາຍໃບຢືມອອກວັນດຽວກັນ (ເຊັ່ນ BRIT2025120002 ແລະ BRIT2025120003
-- ລົງວັນທີ 29-12-2025 ທັງຄູ່) ຖ້າຮຽງດ້ວຍວັນທີຢ່າງດຽວ Postgres
-- ຈະເລືອກແຖວໃດກໍໄດ້ ເຮັດໃຫ້ "ຜູ້ຖືຄອງປັດຈຸບັນ" ສະຫຼັບໄປມາ.

create or replace view it.v_asset_holders as
select distinct on (item_code)
       item_code,
       emp_code,
       emp_name,
       department_code,
       department_name,
       borrow_doc_no,
       from_date
  from public.report_asset_trans_detail
 where return_doc_no is null
 order by item_code,
          from_date desc nulls last,
          borrow_doc_no desc nulls last;
