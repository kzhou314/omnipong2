create table if not exists public.director_layouts (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references public.members(id) on delete cascade,
  name text not null,
  total_tables integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (director_id, name),
  check (total_tables > 0),
  check (total_tables <= 64)
);

create table if not exists public.director_layout_rooms (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.director_layouts(id) on delete cascade,
  name text not null,
  columns integer not null default 8,
  rows integer not null default 8,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (layout_id, name),
  unique (layout_id, sort_order),
  check (columns > 0),
  check (columns <= 20),
  check (rows > 0),
  check (rows <= 20)
);

create table if not exists public.director_layout_tables (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.director_layouts(id) on delete cascade,
  table_number integer not null,
  grid_x integer not null,
  grid_y integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (layout_id, table_number)
);

create table if not exists public.director_layout_objects (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.director_layouts(id) on delete cascade,
  room_id uuid not null references public.director_layout_rooms(id) on delete cascade,
  label text not null default '',
  grid_x integer not null,
  grid_y integer not null,
  width_cells integer not null,
  height_cells integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grid_x > 0),
  check (grid_x <= 20),
  check (grid_y > 0),
  check (grid_y <= 20),
  check (width_cells > 0),
  check (width_cells <= 20),
  check (height_cells > 0),
  check (height_cells <= 20)
);

alter table public.director_layout_tables
add column if not exists room_id uuid references public.director_layout_rooms(id) on delete cascade;

alter table public.tournaments
add column if not exists layout_id uuid references public.director_layouts(id) on delete set null;

insert into public.director_layout_rooms (layout_id, name, columns, rows, sort_order)
select
  public.director_layouts.id,
  'Room 1',
  8,
  8,
  1
from public.director_layouts
where not exists (
  select 1
  from public.director_layout_rooms
  where public.director_layout_rooms.layout_id = public.director_layouts.id
);

update public.director_layout_tables
set room_id = public.director_layout_rooms.id
from public.director_layout_rooms
where public.director_layout_tables.layout_id = public.director_layout_rooms.layout_id
  and public.director_layout_rooms.sort_order = 1
  and public.director_layout_tables.room_id is null;

alter table public.director_layout_tables
alter column room_id set not null;

alter table public.director_layout_tables
drop constraint if exists director_layout_tables_layout_id_grid_x_grid_y_key;

alter table public.director_layout_tables
drop constraint if exists director_layout_tables_grid_x_check;

alter table public.director_layout_tables
drop constraint if exists director_layout_tables_grid_y_check;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'director_layout_tables'
      and con.contype = 'c'
      and (
        pg_get_constraintdef(con.oid) ilike '%grid_x <= 8%'
        or pg_get_constraintdef(con.oid) ilike '%grid_y <= 8%'
      )
  loop
    execute format(
      'alter table public.director_layout_tables drop constraint if exists %I',
      constraint_name
    );
  end loop;
end
$$;

alter table public.director_layout_tables
add constraint director_layout_tables_grid_x_check
check (grid_x > 0 and grid_x <= 20);

alter table public.director_layout_tables
add constraint director_layout_tables_grid_y_check
check (grid_y > 0 and grid_y <= 20);

create unique index if not exists director_layout_tables_room_grid_unique_idx
on public.director_layout_tables (room_id, grid_x, grid_y);

create index if not exists director_layout_objects_room_idx
on public.director_layout_objects (room_id);

alter table public.director_layouts enable row level security;
alter table public.director_layout_rooms enable row level security;
alter table public.director_layout_tables enable row level security;
alter table public.director_layout_objects enable row level security;

drop policy if exists "Directors can view their own layouts" on public.director_layouts;
drop policy if exists "Directors can create their own layouts" on public.director_layouts;
drop policy if exists "Directors can update their own layouts" on public.director_layouts;
drop policy if exists "Directors can delete their own layouts" on public.director_layouts;
drop policy if exists "Directors can view rooms for their layouts" on public.director_layout_rooms;
drop policy if exists "Directors can create rooms for their layouts" on public.director_layout_rooms;
drop policy if exists "Directors can update rooms for their layouts" on public.director_layout_rooms;
drop policy if exists "Directors can delete rooms for their layouts" on public.director_layout_rooms;
drop policy if exists "Directors can view tables for their layouts" on public.director_layout_tables;
drop policy if exists "Directors can create tables for their layouts" on public.director_layout_tables;
drop policy if exists "Directors can update tables for their layouts" on public.director_layout_tables;
drop policy if exists "Directors can delete tables for their layouts" on public.director_layout_tables;
drop policy if exists "Directors can view objects for their layouts" on public.director_layout_objects;
drop policy if exists "Directors can create objects for their layouts" on public.director_layout_objects;
drop policy if exists "Directors can update objects for their layouts" on public.director_layout_objects;
drop policy if exists "Directors can delete objects for their layouts" on public.director_layout_objects;
drop policy if exists "Anyone can view layouts attached to published tournaments" on public.director_layouts;
drop policy if exists "Anyone can view rooms for published tournament layouts" on public.director_layout_rooms;
drop policy if exists "Anyone can view tables for published tournament layouts" on public.director_layout_tables;
drop policy if exists "Anyone can view objects for published tournament layouts" on public.director_layout_objects;

create policy "Directors can view their own layouts"
on public.director_layouts
for select
to authenticated
using (auth.uid() = director_id);

create policy "Directors can create their own layouts"
on public.director_layouts
for insert
to authenticated
with check (
  auth.uid() = director_id
  and public.is_director(auth.uid())
);

create policy "Directors can update their own layouts"
on public.director_layouts
for update
to authenticated
using (auth.uid() = director_id)
with check (
  auth.uid() = director_id
  and public.is_director(auth.uid())
);

create policy "Directors can delete their own layouts"
on public.director_layouts
for delete
to authenticated
using (auth.uid() = director_id);

create policy "Directors can view rooms for their layouts"
on public.director_layout_rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can create rooms for their layouts"
on public.director_layout_rooms
for insert
to authenticated
with check (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can update rooms for their layouts"
on public.director_layout_rooms
for update
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can delete rooms for their layouts"
on public.director_layout_rooms
for delete
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can view tables for their layouts"
on public.director_layout_tables
for select
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can create tables for their layouts"
on public.director_layout_tables
for insert
to authenticated
with check (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can update tables for their layouts"
on public.director_layout_tables
for update
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can delete tables for their layouts"
on public.director_layout_tables
for delete
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can view objects for their layouts"
on public.director_layout_objects
for select
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can create objects for their layouts"
on public.director_layout_objects
for insert
to authenticated
with check (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can update objects for their layouts"
on public.director_layout_objects
for update
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Directors can delete objects for their layouts"
on public.director_layout_objects
for delete
to authenticated
using (
  exists (
    select 1
    from public.director_layouts
    where public.director_layouts.id = layout_id
      and public.director_layouts.director_id = auth.uid()
  )
);

create policy "Anyone can view layouts attached to published tournaments"
on public.director_layouts
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where public.tournaments.layout_id = public.director_layouts.id
      and public.tournaments.status = 'published'
  )
);

create policy "Anyone can view rooms for published tournament layouts"
on public.director_layout_rooms
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.director_layouts
    join public.tournaments
      on public.tournaments.layout_id = public.director_layouts.id
    where public.director_layouts.id = public.director_layout_rooms.layout_id
      and public.tournaments.status = 'published'
  )
);

create policy "Anyone can view tables for published tournament layouts"
on public.director_layout_tables
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.director_layouts
    join public.tournaments
      on public.tournaments.layout_id = public.director_layouts.id
    where public.director_layouts.id = public.director_layout_tables.layout_id
      and public.tournaments.status = 'published'
  )
);

create policy "Anyone can view objects for published tournament layouts"
on public.director_layout_objects
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.director_layouts
    join public.tournaments
      on public.tournaments.layout_id = public.director_layouts.id
    where public.director_layouts.id = public.director_layout_objects.layout_id
      and public.tournaments.status = 'published'
  )
);
