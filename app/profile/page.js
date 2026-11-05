import { requireProfile } from "@/lib/session";
import { signOut } from "@/app/actions";
import { DEMO } from "@/lib/demo";
import ProfileForm from "@/app/components/ProfileForm";

export default async function ProfilePage({ searchParams }) {
  const { profile } = await requireProfile();
  const { saved } = await searchParams;

  return (
    <div className="space-y-4">
      {saved && <p className="mx-auto max-w-xl rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800">Profile saved.</p>}
      <ProfileForm profile={profile} title="Your profile" intro="Testers and builders see this when you match." submitLabel="Save" />
      {!DEMO && (
        <form action={signOut} className="mx-auto max-w-xl text-center">
          <button className="text-sm text-muted underline">Sign out</button>
        </form>
      )}
    </div>
  );
}
