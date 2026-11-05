// Pulls public GitHub data for a user who signed in with or connected GitHub. Server only.
// Sign-ins go through /auth/callback with the GitHub token Supabase hands over once, right after sign-in.
// The token gives 5,000 requests an hour per user. Without it GitHub allows 60 an hour per IP,
// so the tokenless "Refresh from GitHub" button is fine for a click now and then, not for every page load.
// TODO: if refresh starts hitting GitHub 403s, store the provider token or add a GitHub App token.

const LANGUAGES_MAX = 5;
// Repos they can pick from on the profile form (all their own public ones, up to GitHub's 100 per page).
// They feature up to 3 (profiles.featured_repos).
const REPO_CHOICES_MAX = 100;

async function gh(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "trymything.app",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw Object.assign(new Error(`GitHub ${path} returned ${res.status}`), { code: `github_${res.status}` });
  return res.json();
}

// Their own public repos only: no forks (not their code) and no archived ones (not what they do now).
export function summarizeRepos(repos) {
  const own = repos.filter((r) => !r.fork && !r.archived && !r.private);

  const counts = {};
  for (const r of own) if (r.language) counts[r.language] = (counts[r.language] ?? 0) + 1;
  const languages = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, LANGUAGES_MAX)
    .map(([lang]) => lang);

  // Most starred first, then most recently pushed, so people with no stars still show their latest work.
  const top = [...own]
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, REPO_CHOICES_MAX)
    .map((r) => ({ name: r.name, description: r.description, language: r.language, stars: r.stargazers_count }));

  return { languages, repos: top };
}

// Returns a github_profiles row (without id), or throws if GitHub is down or the token is bad.
// With a token it reads the signed-in user. Without one, pass their username to read public data.
export async function fetchGitHubProfile(token, username) {
  const base = token ? "/user" : `/users/${encodeURIComponent(username)}`;
  const user = await gh(base, token);
  // type=owner skips repos they only collaborate on. 100 most recently pushed is plenty to read a stack from.
  const repos = await gh(`${base}/repos?type=owner&sort=pushed&per_page=100`, token);
  return {
    username: user.login,
    name: user.name,
    bio: user.bio,
    location: user.location,
    avatar_url: user.avatar_url,
    ...summarizeRepos(repos),
    fetched_at: new Date().toISOString(),
  };
}
