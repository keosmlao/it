-- 029_drop_old_pr.sql
-- ລຶບຕາຕະລາງ PR ຮຸ່ນເກົ່າໃນ schema it ອອກ
--
-- ຮຸ່ນເກົ່າ (022) ເກັບໃບສະເໜີຊື້ໄວ້ it.purchase_requests ພ້ອມສາຍອະນຸມັດ
-- 2 ຂັ້ນຕາຍຕົວ. ຮຸ່ນໃໝ່ (028) ຍ້າຍໄປເກັບຢູ່ຕາຕະລາງ PR ຂອງ ERP ແລ້ວ
-- ຈຶ່ງລຶບຂອງເກົ່າຖິ້ມ ບໍ່ໃຫ້ມີແຫຼ່ງຂໍ້ມູນສອງບ່ອນ.
--
-- ປອດໄພ: ຮຸ່ນເກົ່າຍັງບໍ່ທັນຖືກໃຊ້ຈິງ (0 ແຖວ) — ຄຳສັ່ງລຸ່ມນີ້ຈະລົ້ມເຫຼວ
-- ຖ້າມີຂໍ້ມູນຢູ່ ເພື່ອກັນການລຶບຂໍ້ມູນຈິງໂດຍບໍ່ຕັ້ງໃຈ

do $$
declare
  n integer;
begin
  select count(*) into n from it.purchase_requests;
  if n > 0 then
    raise exception 'it.purchase_requests ມີ % ແຖວ — ຕ້ອງຍ້າຍຂໍ້ມູນໄປ ERP ກ່ອນຈຶ່ງລຶບໄດ້', n;
  end if;
end $$;

drop view if exists it.v_purchase_requests;
drop table if exists it.pr_approvals;
drop table if exists it.purchase_request_lines;
drop table if exists it.purchase_requests;
