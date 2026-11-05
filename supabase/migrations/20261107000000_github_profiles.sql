-- What GitHub says about a user, kept apart from what they wrote in their profile.
-- Filled by /auth/callback when someone signs in with or connects GitHub (lib/github.js).
-- The profile form uses it to suggest values, and builder cards show languages + top repos.
-- Keyed to auth.users (not profiles) because a GitHub sign-up has no profile row yet.
create table github_profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null,
  name text,
  bio text,
  location text,
  avatar_url text,
  languages text[] not null default '{}', -- most used first, from the primary language of their own public repos
  repos jsonb not null default '[]',      -- [{ "name", "description", "language", "stars" }], their top 20 to pick from, no URLs
  fetched_at timestamptz not null default now()
);

-- Same model as every other table: RLS on, no policies, only server code with the secret key reads it.
alter table github_profiles enable row level security;

-- Lets people hide their GitHub languages + repos from their builder card without disconnecting.
alter table profiles add column show_github boolean not null default true;
