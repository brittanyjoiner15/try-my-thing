import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { getChat, getProfile, getGitHubProfile } from "@/lib/data";
import Avatar from "@/app/components/Avatar";

// Read-only view of the other person in a chat: the same fields they fill in on /profile, minus the form.
// Scoped to a chat (not /people/<id>) so getChat does the access check: you only see people you have a chat with.
// Works for every chat status, so a builder can look at a tester before accepting their request.
export default async function ChatProfilePage({ params }) {
  const { chatId } = await params;
  const { user } = await requireProfile();
  const chat = await getChat(chatId, user.id);
  if (!chat) notFound();

  const [person, github] = await Promise.all([getProfile(chat.them.id), getGitHubProfile(chat.them.id)]);
  if (!person) notFound();

  // Same rule as builder cards (lib/builder-match.js): only the repos they picked, in their order.
  // null = never picked, so fall back to their top 3 like the form does.
  const repos = person.featured_repos
    ? person.featured_repos.map((name) => github?.repos?.find((r) => r.name === name)).filter(Boolean)
    : (github?.repos ?? []).slice(0, 3);
  const languages = github?.languages ?? [];
  // Links only once the chat is open, same as the GitHub/LinkedIn buttons on /matches.
  const open = chat.status === "open";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href={`/matches/${chatId}`} className="text-sm text-muted underline">
        ← Chat
      </Link>

      <div className="panel space-y-6">
        <header className="flex items-center gap-4">
          <Avatar name={person.name} url={person.avatar_url} size="h-20 w-20 text-3xl" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{person.name}</h1>
            <p className="text-muted">{[person.role, person.location].filter(Boolean).join(" · ")}</p>
          </div>
        </header>

        <Field label="Building">{person.building}</Field>
        <Field label="Stack">{person.stack}</Field>
        <Field label="Likes trying">{person.interests}</Field>
        <Chips label="Problem spaces" items={person.topics} />
        <Chips label="Looking for" items={person.looking_for} />

        {(languages.length > 0 || repos.length > 0) && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">On GitHub</h2>
            {languages.length > 0 && <ChipList items={languages} />}
            <ul className="space-y-2">
              {repos.map((repo) => (
                <li key={repo.name} className="rounded-xl border border-border p-3">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-bold">{repo.name}</span>
                    {repo.stars > 0 && <span className="shrink-0 text-xs text-muted">★ {repo.stars}</span>}
                  </p>
                  {repo.description && <p className="mt-0.5 text-sm text-muted">{repo.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {open && (person.github_url || person.linkedin_url) && (
          <section className="flex flex-wrap gap-3">
            {person.github_url && (
              <a href={person.github_url} target="_blank" rel="noreferrer" className="btn-ghost">
                GitHub
              </a>
            )}
            {person.linkedin_url && (
              <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="btn-ghost">
                LinkedIn
              </a>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  if (!children) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-muted">{label}</h2>
      <p className="mt-1 whitespace-pre-line">{children}</p>
    </section>
  );
}

function Chips({ label, items }) {
  if (!items?.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted">{label}</h2>
      <ChipList items={items} />
    </section>
  );
}

function ChipList({ items }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-border px-2.5 py-0.5 text-sm font-semibold">
          {item}
        </li>
      ))}
    </ul>
  );
}
