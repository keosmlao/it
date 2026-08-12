-- 004_assets_kb.sql
-- ອຸປະກອນ IT ແລະ ຄັງຄວາມຮູ້

-- ປະເພດອຸປະກອນ: ຄັດລອກຈາກ public.odg_it_category ທີ່ພະແນກໃຊ້ຢູ່ແລ້ວ
create table it.asset_categories (
  code       varchar(20) primary key,
  name_lo    varchar(100) not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

insert into it.asset_categories (code, name_lo, sort_order)
select code, name_1, roworder
  from public.odg_it_category
 where code is not null
on conflict (code) do nothing;

create table it.assets (
  id                   bigserial primary key,
  asset_code           varchar(40) not null unique,
  name                 varchar(200) not null,
  category_code        varchar(20) references it.asset_categories(code),
  brand                varchar(60),
  model                varchar(100),
  serial_no            varchar(100),
  status               varchar(20) not null default 'in_use'
                       check (status in ('in_use','spare','repair','retired','lost')),
  assigned_employee_id integer,
  location             varchar(100),
  purchase_date        date,
  warranty_until       date,
  note                 text,
  created_by           integer not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index assets_status_idx   on it.assets (status) where deleted_at is null;
create index assets_assigned_idx on it.assets (assigned_employee_id) where deleted_at is null;

create table it.asset_history (
  id                 bigserial primary key,
  asset_id           bigint not null references it.assets(id) on delete cascade,
  action             varchar(20) not null
                     check (action in ('created','assigned','returned','status','repair','note')),
  body               text not null,
  from_employee_id   integer,
  to_employee_id     integer,
  author_employee_id integer not null,
  created_at         timestamptz not null default now()
);

create index asset_history_asset_idx on it.asset_history (asset_id, created_at);

create view it.v_assets as
select a.*,
       c.name_lo as category_name_lo,
       e.fullname_lo as assigned_name,
       d.department_name_lo as assigned_department_name,
       a.warranty_until is not null and a.warranty_until < current_date as warranty_expired,
       a.warranty_until is not null
         and a.warranty_until >= current_date
         and a.warranty_until < current_date + 60                       as warranty_expiring
  from it.assets a
  left join it.asset_categories c on c.code = a.category_code
  left join public.odg_employee e on e.employee_id = a.assigned_employee_id
  left join public.odg_department d on d.department_code = e.department_code
 where a.deleted_at is null;

-- ຄັງຄວາມຮູ້: ວິທີແກ້ບັນຫາທີ່ພົບເລື້ອຍ
create table it.kb_articles (
  id                 bigserial primary key,
  title              varchar(200) not null,
  body               text not null,
  category_code      varchar(20) references it.ticket_categories(code),
  keywords           varchar(300),
  is_published       boolean not null default true,
  view_count         integer not null default 0,
  author_employee_id integer not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create index kb_articles_category_idx on it.kb_articles (category_code) where deleted_at is null;

create view it.v_kb_articles as
select k.*,
       c.name_lo as category_name_lo,
       e.fullname_lo as author_name,
       e.nickname    as author_nickname
  from it.kb_articles k
  left join it.ticket_categories c on c.code = k.category_code
  join public.odg_employee e on e.employee_id = k.author_employee_id
 where k.deleted_at is null;
