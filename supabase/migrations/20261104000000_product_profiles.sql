-- Hinge-style product profiles: logo, one phone screenshot, platforms, and prompt answers.

alter table products
  add column logo_url text,
  add column screenshot_url text,
  add column platforms text[] not null default '{}',
  add column prompts jsonb not null default '[]'; -- [{ "prompt": "...", "answer": "..." }], max 3

-- Public bucket: product images are meant to be seen, so anyone with the URL can load them.
-- No storage policies, so only server code (secret key) can upload. Same model as the tables.
-- SVG is left out on purpose: SVGs can carry scripts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
