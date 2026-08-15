-- 050_replacement_plan.sql
-- ແຜນປ່ຽນເຄື່ອງ — ຕອບວ່າ "ປີໜ້າຄວນປ່ຽນເຄື່ອງໃດແດ່ ແລະ ໃຊ້ເງິນເທົ່າໃດ"
--
-- ເຫດຜົນ: ຂໍ້ມູນຄົບຢູ່ແລ້ວທຸກຢ່າງ (ອາຍຸ, ປະກັນ, ຄ່າສ້ອມສະສົມ, ສະພາບ)
-- ແຕ່ບໍ່ມີບ່ອນລວມມັນເປັນຄຳຕອບ ຈຶ່ງເຮັດງົບປະມານດ້ວຍຄວາມຮູ້ສຶກ
-- **ບໍ່ມີຕາຕະລາງໃໝ່** — ເປັນ view ລ້ວນໆ ຈຶ່ງບໍ່ເພີ່ມພາລະການປ້ອນຂໍ້ມູນ
--
-- ເຫດຜົນທີ່ຄວນປ່ຽນ (ນັບເປັນຂໍ້ ຍິ່ງຫຼາຍຂໍ້ຍິ່ງດ່ວນ):
--   1. ອາຍຸເກີນ 5 ປີ        4. ສ້ອມຫຼາຍກວ່າ 2 ຄັ້ງ
--   2. ໝົດປະກັນແລ້ວ         5. ໝາຍວ່າເພ / ສົ່ງສ້ອມ / ຫາຍ
--   3. ຄ່າສ້ອມເກີນ 40% ຂອງລາຄາຊື້
--
-- ລາຄາປະມານໃຊ້ "ລາຄາຊື້ເດີມ" ເປັນຕົວແທນ — ບໍ່ແມ່ນລາຄາຕະຫຼາດດຽວນີ້
-- ແຕ່ເປັນຕົວເລກທີ່ມີຢູ່ຈິງ ແລະ ໃກ້ຄຽງພໍທີ່ຈະຕັ້ງງົບໄດ້

create or replace view it.v_replacement_candidates as
with base as (
  select a.asset_code,
         a.name,
         a.category_name,
         a.brand,
         a.model,
         a.serial_no,
         a.location_name,
         a.department_name,
         a.holder_name,
         a.is_assigned,
         a.purchase_date,
         a.purchase_price,
         a.warranty_until,
         a.warranty_status,
         coalesce(st.stock_state, 'in_use')                    as stock_state,
         -- ອາຍຸເປັນປີ (ທົດສະນິຍົມ 1 ຕຳແໜ່ງ) — ນັບຈາກວັນຊື້ທີ່ດີທີ່ສຸດທີ່ມີ
         -- ຕ້ອງ cast ເປັນ numeric ກ່ອນ: PG ບໍ່ມີ round(double precision, int)
         round((extract(epoch from (now() - a.purchase_date::timestamp))
                / 31557600.0)::numeric, 1)                     as age_years,
         coalesce(r.repair_count, 0)                           as repair_count,
         coalesce(r.repair_cost, 0)                            as repair_cost
    from it.v_it_assets a
    left join it.asset_stock_status st on st.asset_code::text = a.asset_code::text
    left join (
      select asset_code,
             count(*)                    as repair_count,
             coalesce(sum(cost), 0)      as repair_cost
        from it.v_asset_repairs
       where status <> 'cancelled'
       group by asset_code
    ) r on r.asset_code::text = a.asset_code::text
   where a.is_active
     and coalesce(st.stock_state, 'in_use') <> 'written_off'
), scored as (
  select b.*,
         -- ຫຸ້ມດ້ວຍ coalesce ທຸກຂໍ້: ເຄື່ອງທີ່ບໍ່ມີວັນຊື້ຈະໃຫ້ null ອອກມາ
         -- ແລ້ວ null ຈະລາມໄປທັງການບວກ ຈົນ reason_count ກາຍເປັນ null ໝົດ
         coalesce(b.age_years >= 5, false)                     as reason_age,
         coalesce(b.warranty_status = 'expired', false)        as reason_warranty,
         coalesce(b.purchase_price > 0
                  and b.repair_cost >= b.purchase_price * 0.4, false)
                                                               as reason_cost,
         coalesce(b.repair_count >= 3, false)                  as reason_repairs,
         coalesce(b.stock_state in ('damaged', 'repair', 'missing'), false)
                                                               as reason_condition
    from base b
)
select s.asset_code,
       s.name,
       s.category_name,
       s.brand,
       s.model,
       s.serial_no,
       s.location_name,
       s.department_name,
       s.holder_name,
       s.is_assigned,
       s.purchase_date,
       s.purchase_price,
       s.warranty_until,
       s.warranty_status,
       s.stock_state,
       s.age_years,
       s.repair_count,
       s.repair_cost,
       s.reason_age,
       s.reason_warranty,
       s.reason_cost,
       s.reason_repairs,
       s.reason_condition,
       (s.reason_age::int + s.reason_warranty::int + s.reason_cost::int
        + s.reason_repairs::int + s.reason_condition::int)     as reason_count,
       case
         when s.reason_condition or coalesce(s.age_years >= 7, false)
              or (s.reason_age::int + s.reason_warranty::int + s.reason_cost::int
                  + s.reason_repairs::int) >= 3                then 'high'
         when (s.reason_age::int + s.reason_warranty::int + s.reason_cost::int
               + s.reason_repairs::int) >= 2                   then 'medium'
         else 'low'
       end                                                     as priority,
       -- ໃຊ້ລາຄາຊື້ເດີມເປັນຕົວປະມານ — ບໍ່ມີລາຄາກໍນັບເປັນ 0 ແລ້ວໃຫ້ຄົນຕື່ມເອງ
       coalesce(s.purchase_price, 0)                           as estimated_cost
  from scored s
 where s.reason_age or s.reason_warranty or s.reason_cost
    or s.reason_repairs or s.reason_condition;
