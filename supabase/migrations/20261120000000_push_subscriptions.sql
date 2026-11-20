-- Web push: one row per device (phone, laptop browser) where someone turned on notifications on /profile.
-- lib/push.js sends to every row for a user, and deletes a row when the push service says it's gone (404/410).
-- endpoint is the push service URL for that device; p256dh and auth are its encryption keys. Issue #48.
create table push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text, -- just to tell devices apart when debugging
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id on push_subscriptions (user_id);

-- Same model as every other table: RLS on, no policies, only server code with the secret key reads it.
alter table push_subscriptions enable row level security;
