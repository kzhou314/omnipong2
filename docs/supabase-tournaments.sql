create table public.member_roles (
  member_id uuid not null references public.members(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, role),
  check (role in ('player', 'director', 'admin'))
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references public.members(id) on delete restrict,
  name text not null,
  venue_name text not null,
  city text not null,
  state text not null,
  start_date date not null,
  end_date date not null,
  flyer_url text,
  registration_open timestamptz,
  registration_close timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft', 'published', 'closed', 'cancelled')),
  check (end_date >= start_date)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  entry_fee_cents integer not null default 0,
  capacity integer not null,
  table_count integer not null default 1,
  rating_min integer,
  rating_max integer,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entry_fee_cents >= 0),
  check (capacity > 0),
  check (table_count > 0),
  check (end_time > start_time),
  check (status in ('scheduled', 'full', 'closed', 'cancelled'))
);

create table public.event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  payment_status text not null default 'unpaid',
  signup_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id),
  check (payment_status in ('unpaid', 'paid', 'refunded')),
  check (signup_status in ('pending', 'confirmed', 'withdrawn', 'waitlisted'))
);
