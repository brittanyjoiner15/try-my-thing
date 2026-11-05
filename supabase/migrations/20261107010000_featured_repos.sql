-- People pick up to 3 repos to feature on their builder card, from the ones in github_profiles.repos.
-- null = never picked (the form pre-checks their top 3), {} = chose to show none.
alter table profiles add column featured_repos text[];

-- Replaced by featured_repos: picking no repos hides them. Added earlier today and never read elsewhere.
alter table profiles drop column show_github;
