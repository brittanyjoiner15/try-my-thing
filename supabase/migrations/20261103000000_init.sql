-- Builder matchmaker schema.
-- RLS is ON with NO policies: the browser (publishable key) can't read or write any table.
-- All reads and writes go through server code that checks the logged-in user first,
-- then uses the secret key. This keeps everyone's email private by default.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text not null,
  role text not null,
  stack text not null,
  interests text,
  discord_handle text,
  shoutout_ok boolean not null default false,
  consent_at timestamptz not null, -- agreed to share name + email with matches
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  name text not null,
  url text not null,
  tagline text not null,
  wants text not null,        -- who should try it
  feedback_on text not null,  -- what they want feedback on
  stage text not null,
  perk text not null,         -- what testers get
  max_testers int not null default 3,
  hidden boolean not null default false, -- hidden by admin or paused by owner
  created_at timestamptz not null default now()
);

-- A right swipe is a match. intro/check-in timestamps track the emails.
create table swipes (
  tester_id uuid not null references profiles on delete cascade,
  product_id uuid not null references products on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  intro_sent_at timestamptz,
  checkin_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tester_id, product_id)
);

create index swipes_product_right on swipes (product_id) where direction = 'right';

alter table profiles enable row level security;
alter table products enable row level security;
alter table swipes enable row level security;
