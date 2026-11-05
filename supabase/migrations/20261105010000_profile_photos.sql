-- Profile photos for builder cards and matches. Stored in the existing public product-images bucket
-- under avatars/<user id>/, uploaded only by server code (same model as product images).
alter table profiles add column avatar_url text;
