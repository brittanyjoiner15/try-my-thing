import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { getProfile } from "@/lib/data";
import ProfileForm from "@/app/components/ProfileForm";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (await getProfile(user.id)) redirect("/swipe");

  return (
    <ProfileForm
      title="About you"
      intro="Builders see this when you match, so they know who's trying their thing."
      submitLabel="Let's go"
    />
  );
}
