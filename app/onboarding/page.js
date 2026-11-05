import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { getProfile, getGitHubProfile } from "@/lib/data";
import ProfileForm from "@/app/components/ProfileForm";
import GitHubConnect from "@/app/components/GitHubConnect";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (await getProfile(user.id)) redirect("/swipe");
  const github = await getGitHubProfile(user.id);

  return (
    <div className="space-y-4">
      {/* Signed up with GitHub: the form is already filled in, so the connect panel would just be noise. */}
      {!github && <GitHubConnect />}
      <ProfileForm
        github={github}
        title="About you"
        intro="Builders see this when you match, so they know who's trying their thing."
        submitLabel="Let's go"
      />
    </div>
  );
}
