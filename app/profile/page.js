import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireProfile } from "@/lib/session";
import { signOut } from "@/app/actions";
import { DEMO_ENV, isDemo } from "@/lib/demo";
import { getGitHubProfile } from "@/lib/data";
import ProfileForm from "@/app/components/ProfileForm";
import GitHubConnect from "@/app/components/GitHubConnect";
import ConnectQR from "@/app/components/ConnectQR";
import { ensureConnectCode } from "@/lib/connect";

export default async function ProfilePage({ searchParams }) {
  const { user, profile } = await requireProfile();
  const { saved, github: githubStatus } = await searchParams;
  const demo = await isDemo();
  const github = await getGitHubProfile(user.id);
  // The page's own host, so the QR works on localhost, Netlify previews and the real domain.
  const h = await headers();
  const connectUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/c/${await ensureConnectCode(profile)}`;
  const qrSvg = await QRCode.toString(connectUrl, { type: "svg", margin: 0 });
  // Supabase won't unlink someone's only way to sign in, so GitHub-only accounts can't disconnect.
  const canDisconnect = demo || (user.identities?.length ?? 0) > 1;

  return (
    <div className="space-y-4">
      {saved && <p className="mx-auto max-w-xl rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800">Profile saved.</p>}
      <ConnectQR url={connectUrl} qrSvg={qrSvg} />
      <GitHubConnect github={github} status={githubStatus} canDisconnect={canDisconnect} />
      <ProfileForm profile={profile} github={github} title="Your profile" intro="Testers and builders see this when you match." submitLabel="Save" />
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
