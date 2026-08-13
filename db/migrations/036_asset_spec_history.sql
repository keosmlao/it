-- 036_asset_spec_history.sql
-- ປະຫວັດການແກ້ໄຂ spec ເຄື່ອງ
--
-- ເຫດຜົນ: `it.asset_specs` ເປັນແຖວດຽວຕໍ່ເຄື່ອງ ແລະ ຖືກ upsert ທັບທຸກຄັ້ງ
-- ຈຶ່ງບໍ່ຮູ້ວ່າໃຜແກ້ຫຍັງ ຈາກຫຍັງເປັນຫຍັງ. ບັນຫາຈິງທີ່ພົບ:
-- ເມື່ອຄົນອື່ນປ່ຽນ RAM ຫຼື ວັນໝົດປະກັນ ແລ້ວບໍ່ມີທາງກວດຄືນ.
--
-- ບັນທຶກດ້ວຍ trigger ບໍ່ແມ່ນໃນ action ເພື່ອໃຫ້ຄອບທຸກເສັ້ນທາງ
-- (action, script, ແກ້ດ້ວຍມືໃນ psql) — ບໍ່ມີທາງລອດ.

create table if not exists it.asset_spec_history (
  id         bigserial primary key,
  asset_code varchar(40) not null,
  field      varchar(30) not null,
  old_value  text,
  new_value  text,
  changed_by integer,
  changed_at timestamptz not null default now()
);

create index if not exists asset_spec_history_asset_idx
  on it.asset_spec_history (asset_code, changed_at desc, id desc);

-- ໜຶ່ງແຖວຕໍ່ໜຶ່ງຊ່ອງທີ່ປ່ຽນ — ອ່ານເປັນ timeline ໄດ້ເລີຍ
-- ("RAM 8GB → 16GB") ບໍ່ຕ້ອງໄປທຽບ snapshot ເອງ
create or replace function it.log_asset_spec_change() returns trigger as $fn$
declare
  f      text;
  old_v  text;
  new_v  text;
  fields text[] := array[
    'cpu', 'ram', 'storage', 'gpu', 'os', 'screen', 'spec_note',
    'purchase_date', 'purchase_price', 'warranty_until', 'warranty_note'
  ];
  oj jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  nj jsonb := to_jsonb(new);
begin
  foreach f in array fields loop
    old_v := oj ->> f;
    new_v := nj ->> f;
    -- `is distinct from` ເພື່ອໃຫ້ null → ຄ່າ ແລະ ຄ່າ → null ນັບເປັນການປ່ຽນ
    if old_v is distinct from new_v then
      insert into it.asset_spec_history
        (asset_code, field, old_value, new_value, changed_by)
      values (new.asset_code, f, old_v, new_v, new.updated_by);
    end if;
  end loop;
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists asset_specs_history on it.asset_specs;
create trigger asset_specs_history
  after insert or update on it.asset_specs
  for each row execute procedure it.log_asset_spec_change();

create or replace view it.v_asset_spec_history as
  select h.id,
         h.asset_code,
         h.field,
         h.old_value,
         h.new_value,
         h.changed_by,
         e.fullname_lo as changed_by_name,
         e.nickname    as changed_by_nickname,
         h.changed_at
    from it.asset_spec_history h
    left join public.odg_employee e on e.employee_id = h.changed_by;
