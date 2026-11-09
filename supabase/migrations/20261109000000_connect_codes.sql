-- In-person connect: each person's link (/c/<code>) and QR code. Whoever opens it and taps Connect
-- gets an open builder-style chat with them. Filled in by app code the first time someone opens /profile.
-- Resetting it (on /profile) kills the old link, for when it gets forwarded somewhere it shouldn't.
alter table profiles add column connect_code text unique;
