-- Featured products sit at the top of everyone's swipe deck (e.g. the PostHog example product).
-- Set by hand in SQL for now. There's no UI for it.
alter table products add column featured boolean not null default false;
