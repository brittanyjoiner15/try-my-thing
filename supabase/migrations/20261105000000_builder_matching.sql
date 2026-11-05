-- Builder ↔ builder matching: richer profiles, and a likes table where a match needs both people to swipe right.

alter table profiles
  add column open_to_builders boolean not null default false, -- shows up in other builders' decks
  add column building text,                                   -- what I'm building / problems I'm working on
  add column topics text[] not null default '{}',             -- problem spaces, from lib/profile-options.js
  add column looking_for text[] not null default '{}',        -- what kind of builder connection, from lib/profile-options.js
  add column location text,                                   -- display label from geocoding, e.g. "Austin, United States"
  add column lat double precision,                            -- rounded to 1 decimal (~10 km) so exact location is never stored
  add column lng double precision,
  add column github_url text,
  add column linkedin_url text;

create table builder_likes (
  from_id uuid not null references profiles on delete cascade,
  to_id uuid not null references profiles on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create index builder_likes_to_right on builder_likes (to_id) where direction = 'right';

-- Same privacy model as the other tables: RLS on, no policies, server reads with the secret key.
alter table builder_likes enable row level security;
