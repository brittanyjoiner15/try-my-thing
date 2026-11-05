import { requireProfile } from "@/lib/session";
import { signOut } from "@/app/actions";
import { DEMO_ENV, isDemo } from "@/lib/demo";
import ProfileForm from "@/app/components/ProfileForm";

export default async function ProfilePage({ searchParams }) {
  const { profile } = await requireProfile();
  const { saved } = await searchParams;
  const demo = await isDemo();

  return (
    <div className="space-y-4">
      {saved && <p className="mx-auto max-w-xl rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800">Profile saved.</p>}
      <ProfileForm profile={profile} title="Your profile" intro="Testers and builders see this when you match." submitLabel="Save" />
      {!demo && (
        <form action={signOut} data-posthog-sign-out className="mx-auto max-w-xl text-center">
          <button className="text-sm text-muted underline">Sign out</button>
        </form>
      )}
      {demo && !DEMO_ENV && (
        <form action="/demo/exit" method="post" data-posthog-exit-demo className="mx-auto max-w-xl text-center">
          <button className="text-sm text-muted underline">Exit demo</button>
        </form>
      )}
    </div>
  );
}
