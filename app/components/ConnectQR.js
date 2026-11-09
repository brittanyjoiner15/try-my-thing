"use client";

// "Meet someone in person" panel on /profile: your QR code and link. Whoever opens it can tap
// Connect and message you right away (app/c/[code]). Sits outside ProfileForm because forms can't be nested.
import { useState } from "react";
import { useFormStatus } from "react-dom";
import posthog from "posthog-js";
import { resetConnectCode } from "@/app/actions";

export default function ConnectQR({ url, qrSvg }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    let method = "copy";
    try {
      if (navigator.share) {
        method = "share";
        await navigator.share({ title: "Connect with me on try my thing", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      return; // share sheet closed, or clipboard blocked
    }
    posthog.capture("connect_link_shared", { method });
  }

  function toggle() {
    if (!open) posthog.capture("connect_qr_shown");
    setOpen(!open);
  }

  return (
    <div className="panel mx-auto max-w-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-bold">Meet someone in person?</p>
          <p className="text-sm text-muted">They scan your QR code, tap Connect, and you&apos;re in a chat. No swiping.</p>
        </div>
        <button type="button" className="btn-primary" onClick={toggle}>
          {open ? "Hide QR code" : "Show my QR code"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col items-center gap-3 pt-2">
          {/* White box so it scans in dark mode too. SVG comes from the qrcode package on the server. */}
          <div className="w-full max-w-64 rounded-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-sm text-muted break-all">{url}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <button type="button" className="text-sm font-semibold text-accent underline" onClick={share}>
              {copied ? "Link copied" : "Share link"}
            </button>
            <form
              action={resetConnectCode}
              onSubmit={(e) => {
                if (!confirm("Make a new link and QR code? The old one stops working.")) e.preventDefault();
              }}
            >
              <ResetButton />
            </form>
          </div>
          <p className="hint text-center">Anyone with this link can message you. Reset it if it ends up somewhere public.</p>
        </div>
      )}
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button className="text-sm text-muted underline disabled:opacity-60" disabled={pending}>
      {pending ? "Resetting…" : "Reset link"}
    </button>
  );
}
