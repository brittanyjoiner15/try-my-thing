import Link from "next/link";
import { getUser } from "@/lib/session";
import { getProfile, getProfileByConnectCode } from "@/lib/data";
import { CONNECT_CODE } from "@/lib/connect";
import { startConnect } from "@/app/actions";
import Avatar from "@/app/components/Avatar";
import ConnectButton from "./ConnectButton";

export const metadata = { title: "Connect on try my thing" };

// Someone's in-person link, opened from their QR code. Nothing happens until the visitor taps
// Connect, so a link preview in Slack or iMessage can't match anyone by accident.
// Open to signed-out visitors: they need to see who they're connecting with before signing up.
export default async function ConnectPage({ params }) {
  const { code } = await params;
  const owner = CONNECT_CODE.test(code) ? await getProfileByConnectCode(code) : null;
  if (!owner) {
    return (
      <div className="panel mx-auto mt-12 max-w-md text-center">
        <h1 className="text-xl font-bold">This link doesn&apos;t work anymore</h1>
        <p className="mt-2 text-muted">They may have reset it. Ask them to show you their QR code again.</p>
      </div>
    );
  }

  const user = await getUser();
  const me = user ? await getProfile(user.id) : null;

  return (
    <div className="mx-auto max-w-md space-y-4 pt-8">
      {/* Only what a card shows. The owner record includes their email. */}
      <div className="panel flex flex-col items-center text-center">
        <Avatar name={owner.name} url={owner.avatar_url} size="h-24 w-24 text-4xl" />
        <h1 className="mt-3 text-2xl font-bold wrap-anywhere">{owner.name}</h1>
        <p className="text-muted">
          {owner.role}
          {owner.location && ` · ${owner.location}`}
        </p>
        {owner.building && <p className="mt-3 wrap-anywhere">{owner.building}</p>}
      </div>

      {me?.id === owner.id ? (
        <p className="text-center text-sm text-muted">
          This is your link. Show it to someone you meet, and they can message you right away.{" "}
          <Link href="/profile" className="font-semibold text-accent underline">
            Back to your profile
          </Link>
        </p>
      ) : me ? (
        <ConnectButton code={code} firstName={owner.name.split(" ")[0]} />
      ) : (
        <form action={startConnect.bind(null, code)} className="space-y-2 text-center">
          <button className="btn-primary w-full">{user ? "Finish your profile to connect" : "Sign up to connect"}</button>
          <p className="hint">Takes about a minute. You&apos;ll come right back here.</p>
        </form>
      )}
    </div>
  );
}
