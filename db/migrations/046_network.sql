-- 046_network.sql
-- ເອກະສານເຄືອຂ່າຍ — ວົງເນັດ (VLAN/subnet), ທະບຽນ IP ແລະ ຜັງພອດສະວິດ
--
-- ເຫດຜົນ: ດຽວນີ້ຄວາມຮູ້ເລື່ອງເຄືອຂ່າຍຢູ່ໃນຫົວຄົນ ແລະ ໃນເຈ້ຍ — ຜູ້ໃໝ່ເຂົ້າມາ
-- ຫຼື ຄົນເກົ່າລາພັກ ແລ້ວເນັດມີບັນຫາ ຈະຫາບໍ່ພົບວ່າສາຍໃດໄປຫ້ອງໃດ
-- ຫຼື IP ໃດຫວ່າງໃຫ້ໃຊ້ໄດ້
--
-- ໃຊ້ຊະນິດ `inet` ຂອງ PostgreSQL ຈຶ່ງຮຽງລຳດັບ IP ໄດ້ຖືກຕ້ອງ
-- (varchar ຈະຮຽງ 10.0.0.2 ໄວ້ຫຼັງ 10.0.0.10)

create table if not exists it.network_segments (
  id          bigserial primary key,
  name        varchar(120) not null,
  vlan_id     integer check (vlan_id is null or vlan_id between 1 and 4094),
  cidr        varchar(50) not null,
  gateway     varchar(45),
  dns         varchar(120),
  dhcp_range  varchar(80),
  location_code varchar(20),
  purpose     varchar(200),
  note        text,
  is_active   boolean not null default true,
  created_by  integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists network_segments_cidr_idx
  on it.network_segments (lower(cidr));

create table if not exists it.ip_assignments (
  id           bigserial primary key,
  segment_id   bigint not null references it.network_segments(id) on delete cascade,
  ip_address   inet not null,
  hostname     varchar(120),
  -- ຜູກກັບທະບຽນອຸປະກອນຖ້າເປັນເຄື່ອງທີ່ຂຶ້ນທະບຽນໄວ້
  asset_code   varchar(40),
  mac_address  varchar(60),
  employee_id  integer,
  kind         varchar(12) not null default 'static'
               check (kind in ('static','reservation','reserved','dhcp')),
  status       varchar(10) not null default 'in_use'
               check (status in ('in_use','free','blocked')),
  note         varchar(300),
  created_by   integer not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- IP ດຽວກັນຈອງສອງບ່ອນບໍ່ໄດ້ — ນີ້ຄືສາເຫດອັນດັບໜຶ່ງຂອງ "ເນັດຫຼຸດເປັນບາງເຄື່ອງ"
create unique index if not exists ip_assignments_unique_idx
  on it.ip_assignments (ip_address);
create index if not exists ip_assignments_segment_idx
  on it.ip_assignments (segment_id, ip_address);

create table if not exists it.switch_ports (
  id                bigserial primary key,
  switch_asset_code varchar(40) not null,
  port_label        varchar(30) not null,
  description       varchar(200),
  patch_panel       varchar(60),
  room              varchar(120),
  vlan_id           integer check (vlan_id is null or vlan_id between 1 and 4094),
  connected_asset_code varchar(40),
  is_uplink         boolean not null default false,
  is_active         boolean not null default true,
  note              varchar(300),
  created_by        integer not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists switch_ports_unique_idx
  on it.switch_ports (switch_asset_code, upper(port_label));

create or replace view it.v_network_segments as
select s.id,
       s.name,
       s.vlan_id,
       s.cidr,
       s.gateway,
       s.dns,
       s.dhcp_range,
       s.location_code,
       loc.name_1                        as location_name,
       s.purpose,
       s.note,
       s.is_active,
       s.created_by,
       s.created_at,
       s.updated_at,
       coalesce(a.total, 0)              as ip_count,
       coalesce(a.in_use, 0)             as ip_in_use
  from it.network_segments s
  left join public.as_asset_location loc on loc.code::text = s.location_code::text
  left join (select segment_id, count(*) as total,
                    count(*) filter (where status = 'in_use') as in_use
               from it.ip_assignments group by segment_id) a on a.segment_id = s.id;

create or replace view it.v_ip_assignments as
select i.id,
       i.segment_id,
       s.name                         as segment_name,
       s.vlan_id,
       s.cidr,
       host(i.ip_address)             as ip,
       i.ip_address,
       i.hostname,
       i.asset_code,
       a.name                         as asset_name,
       i.mac_address,
       i.employee_id,
       e.fullname_lo                  as employee_name,
       i.kind,
       i.status,
       i.note,
       i.created_by,
       i.created_at,
       i.updated_at
  from it.ip_assignments i
  join it.network_segments s on s.id = i.segment_id
  left join it.v_it_assets a on a.asset_code::text = i.asset_code::text
  left join public.odg_employee e on e.employee_id = i.employee_id;

create or replace view it.v_switch_ports as
select p.id,
       p.switch_asset_code,
       sw.name                        as switch_name,
       sw.location_name               as switch_location,
       p.port_label,
       p.description,
       p.patch_panel,
       p.room,
       p.vlan_id,
       p.connected_asset_code,
       target.name                    as connected_asset_name,
       p.is_uplink,
       p.is_active,
       p.note,
       p.created_by,
       p.created_at,
       p.updated_at
  from it.switch_ports p
  left join it.v_it_assets sw     on sw.asset_code::text = p.switch_asset_code::text
  left join it.v_it_assets target on target.asset_code::text = p.connected_asset_code::text;
