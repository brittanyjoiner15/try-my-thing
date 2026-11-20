import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireProfile } from "@/lib/session";
import { signOut } from "@/app/actions";
import { getGitHubProfile } from "@/lib/data";
import ProfileForm from "@/app/components/ProfileForm";
import GitHubConnect from "@/app/components/GitHubConnect";
import ConnectQR from "@/app/components/ConnectQR";
import PushToggle from "@/app/components/PushToggle";
import { ensureConnectCode } from "@/lib/connect";

export default async function ProfilePage({ searchParams }) {
  const { user, profile } = await requireProfile();
  const { saved, github: githubStatus } = await searchParams;
  const github = await getGitHubProfile(user.id);
  // The page's own host, so the QR works on localhost, Netlify previews and the real domain.
  const h = await headers();
  const connectUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/c/${await ensureConnectCode(profile)}`;
  const qrSvg = await QRCode.toString(connectUrl, { type: "svg", margin: 0 });
  // Supabase won't unlink someone's only way to sign in, so GitHub-only accounts can't disconnect.
  const canDisconnect = (user.identities?.length ?? 0) > 1;

  return (
    <div className="space-y-4">
      {saved && <p className="mx-auto max-w-xl rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800">Profile saved.</p>}
      <PushToggle />
      <ConnectQR url={connectUrl} qrSvg={qrSvg} />
      <GitHubConnect github={github} status={githubStatus} canDisconnect={canDisconnect} />
      <ProfileForm profile={profile} github={github} title="Your profile" intro="Testers and builders see this when you match." submitLabel="Save" />
      {/* Only the owner sees this page, so showing their own email keeps the privacy model. ph-no-capture keeps it out of replays. */}
      {user.email && (
        <p className="mx-auto max-w-xl text-center text-sm text-muted">
          Signed in as <span className="ph-no-capture font-medium text-foreground wrap-anywhere">{user.email}</span>
          <br />
          Only you can see this. Other people never see your email.
        </p>
      )}
      <form action={signOut} data-posthog-sign-out className="mx-auto max-w-xl text-center">
        <button className="text-sm text-muted underline">Sign out</button>
      </form>
    </div>
  );
}
