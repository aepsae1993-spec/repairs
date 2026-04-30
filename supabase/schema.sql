-- รันใน Supabase > SQL Editor

create type repair_status as enum ('pending', 'accepted', 'in_progress', 'completed');

create table if not exists repairs (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  description  text,
  location     text,
  reporter     text        not null,
  phone        text,
  image_url    text,
  status       repair_status not null default 'pending',
  handler      text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists repairs_status_idx     on repairs(status);
create index if not exists repairs_created_at_idx on repairs(created_at desc);

-- trigger update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_set_updated_at on repairs;
create trigger trg_set_updated_at
before update on repairs
for each row execute function set_updated_at();

-- เปิด RLS แล้ว server ใช้ service-role key (ข้าม RLS ได้)
alter table repairs enable row level security;
