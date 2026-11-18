-- Claim links: Britt prefills a product for a builder on /admin and sends them /claim/<code>.
-- Until someone claims it, the product has no owner, so it stays out of every deck.
-- Whoever opens the link and taps Claim first becomes the owner, and the code is cleared.
alter table products alter column owner_id drop not null;
alter table products add column claim_code text unique;
alter table products add constraint products_owner_or_claim_code check (owner_id is not null or claim_code is not null);
