-- One chat per pair of people. Before this, every product request and every builder match had its own chat,
-- so two people could have 3 threads with each other.
--   chats: one row per pair, user_a < user_b. status: 'open' (can message), 'pending' (only unanswered
--          product requests so far), 'declined' (every request was passed and nothing else opened it).
--   product_requests: a tester asking to try a product. Lives in the pair's chat. The builder accepts or passes
--          each one. A request made while the chat is already open is accepted right away.
--   messages.kind: 'text' (typed by a person) or 'request' (the "X wants to try Y" line in the thread,
--          sender_id = the tester, request_id = the request).
-- Existing chats for the same pair merge into the oldest one: messages move over, each old product chat
-- becomes a request with its line at the original time, and read/notify times keep the latest per person.
-- Runs in one transaction. Apply by hand (see AGENTS.md), then deploy the matching code right away.

begin;

create table product_requests (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats on delete cascade,
  tester_id uuid not null references profiles on delete cascade,
  product_id uuid not null references products on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (tester_id, product_id)
);
create index product_requests_chat on product_requests (chat_id);
create index product_requests_product on product_requests (product_id) where status <> 'declined'; -- max_testers counts

alter table product_requests enable row level security; -- same privacy model: no policies, server reads with the secret key

alter table messages
  add column kind text not null default 'text' check (kind in ('text', 'request')),
  add column request_id uuid references product_requests on delete cascade;

-- Old unique indexes allowed several chats per pair.
drop index chats_product_unique;
drop index chats_builder_unique;

-- Every chat → the pair's oldest chat (the keeper).
create temp table chat_map on commit drop as
select
  id,
  first_value(id) over (partition by least(user_a, user_b), greatest(user_a, user_b) order by created_at, id) as keeper,
  least(user_a, user_b) as lo,
  greatest(user_a, user_b) as hi
from chats;

-- Product chats become requests (user_a was always the tester), pointed at the keeper.
insert into product_requests (chat_id, tester_id, product_id, status, created_at, answered_at)
select m.keeper, c.user_a, c.product_id,
  case c.status when 'open' then 'accepted' when 'declined' then 'declined' else 'pending' end,
  c.created_at,
  case when c.status <> 'pending' then c.created_at end
from chats c
join chat_map m on m.id = c.id
where c.product_id is not null;

-- One "wants to try" line per request, at the time it was made.
insert into messages (chat_id, sender_id, body, kind, request_id, created_at)
select r.chat_id, r.tester_id, 'wants to try ' || p.name, 'request', r.id, r.created_at
from product_requests r
join products p on p.id = r.product_id;

-- Typed messages move to the keeper.
update messages msg set chat_id = m.keeper from chat_map m where m.id = msg.chat_id and m.id <> m.keeper;

-- Keeper gets user_a < user_b, the merged status, and per-person read/notify times (latest across the pair's chats).
with per_person as (
  select m.keeper,
    max(case when c.user_a = m.lo then c.a_read_at else c.b_read_at end) as lo_read,
    max(case when c.user_a = m.hi then c.a_read_at else c.b_read_at end) as hi_read,
    max(case when c.user_a = m.lo then c.a_notified_at else c.b_notified_at end) as lo_notified,
    max(case when c.user_a = m.hi then c.a_notified_at else c.b_notified_at end) as hi_notified,
    case
      when bool_or(c.status = 'open') then 'open'
      when bool_or(c.status = 'pending') then 'pending'
      else 'declined'
    end as status,
    min(c.created_at) as created_at,
    min(m.lo::text)::uuid as lo,
    min(m.hi::text)::uuid as hi
  from chats c
  join chat_map m on m.id = c.id
  group by m.keeper
)
update chats c set
  user_a = p.lo, user_b = p.hi,
  a_read_at = p.lo_read, b_read_at = p.hi_read,
  a_notified_at = p.lo_notified, b_notified_at = p.hi_notified,
  status = p.status, created_at = p.created_at
from per_person p
where c.id = p.keeper;

delete from chats c using chat_map m where m.id = c.id and m.id <> m.keeper;

-- Last typed message across the merged chats. Request lines don't count (same rule as insertMessage).
update chats c set last_message_at = l.created_at, last_sender_id = l.sender_id
from (
  select distinct on (chat_id) chat_id, created_at, sender_id from messages where kind = 'text' order by chat_id, created_at desc
) l
where l.chat_id = c.id;

alter table chats drop column product_id;
alter table chats add constraint chats_pair_order check (user_a < user_b);
create unique index chats_pair_unique on chats (user_a, user_b);

commit;
