-- In-app chat. Every match gets one chat, and emails are no longer shared between matches.
--   Tester → product: user_a = tester, user_b = builder, product_id set. Starts 'pending' until the builder accepts.
--   Builder ↔ builder: product_id null, user_a < user_b. Starts 'open' (both people already swiped right).
-- Read and notify timestamps live on the chat (one pair per person), so unread checks never scan messages.

create table chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles on delete cascade,
  user_b uuid not null references profiles on delete cascade,
  product_id uuid references products on delete cascade,
  status text not null default 'open' check (status in ('pending', 'open', 'declined')),
  last_message_at timestamptz,
  last_sender_id uuid references profiles on delete set null,
  a_read_at timestamptz,
  b_read_at timestamptz,
  a_notified_at timestamptz, -- last "new message" email, so we send one per unread stretch, not one per message
  b_notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);

create unique index chats_product_unique on chats (user_a, product_id) where product_id is not null;
create unique index chats_builder_unique on chats (user_a, user_b) where product_id is null;
create index chats_user_a on chats (user_a);
create index chats_user_b on chats (user_b);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats on delete cascade,
  sender_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_chat_created on messages (chat_id, created_at);
create index messages_sender_created on messages (sender_id, created_at); -- rate limit lookups

-- Same privacy model as the other tables: RLS on, no policies, server reads with the secret key.
alter table chats enable row level security;
alter table messages enable row level security;

-- Backfill chats for matches made before chat existed. These people already had each other's
-- email, so tester chats start 'open' instead of waiting on the builder.
insert into chats (user_a, user_b, product_id, status, created_at)
select s.tester_id, p.owner_id, s.product_id, 'open', s.created_at
from swipes s
join products p on p.id = s.product_id
where s.direction = 'right' and s.tester_id <> p.owner_id
on conflict do nothing;

insert into chats (user_a, user_b, status, created_at)
select mine.from_id, mine.to_id, 'open', greatest(mine.created_at, theirs.created_at)
from builder_likes mine
join builder_likes theirs on theirs.from_id = mine.to_id and theirs.to_id = mine.from_id
where mine.direction = 'right' and theirs.direction = 'right' and mine.from_id < mine.to_id
on conflict do nothing;
