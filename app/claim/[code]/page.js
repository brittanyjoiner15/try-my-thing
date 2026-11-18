import Link from "next/link";
import { getUser, isAdmin } from "@/lib/session";
import { getProfile, getProductByClaimCode } from "@/lib/data";
import { CLAIM_CODE } from "@/lib/claim";
import { startClaim } from "@/app/actions";
import ProductProfile from "@/app/components/ProductProfile";
import SubmitButton from "@/app/components/SubmitButton";
import ClaimButton from "./ClaimButton";
import CopyClaimLink from "./CopyClaimLink";
import TrackClaimView from "./TrackClaimView";

const findProduct = async (code) => (CLAIM_CODE.test(code) ? await getProductByClaimCode(code) : null);

// The link preview in a DM or email shows the product name. Kept out of search engines: it's a private link.
export async function generateMetadata({ params }) {
  const product = await findProduct((await params).code);
  return {
    title: product ? `${product.name} on try my thing` : "try my thing",
    description: product ? "Your product is ready for testers. Claim it to go live." : undefined,
    robots: { index: false, follow: false },
  };
}

// A product Britt prefilled for a builder, shown the way testers would see it. Open to signed-out visitors.
// Nothing changes until they tap Claim, so a link preview can't claim it by accident.
export default async function ClaimPage({ params }) {
  const { code } = await params;
  const product = await findProduct(code);
  const user = await getUser();

  if (!product) {
    return (
      <div className="panel mx-auto mt-12 max-w-md text-center">
        <h1 className="text-xl font-bold">This link doesn&apos;t work anymore</h1>
        <p className="mt-2 text-muted">Someone already claimed this product. If that was you, it&apos;s in your products.</p>
        <Link href={user ? "/products" : "/login"} className="btn-primary mt-4 inline-block">
          {user ? "My products" : "Sign in"}
        </Link>
      </div>
    );
  }

  const admin = isAdmin(user);
  const me = user && !admin ? await getProfile(user.id) : null;

  return (
    <div className="mx-auto max-w-md space-y-4 pt-4">
      {admin ? (
        <div className="space-y-3 rounded-xl bg-accent/10 px-4 py-3 text-sm">
          <p>Admin preview. Send this link to the builder. Whoever claims it first owns it, so send it privately.</p>
          <div className="flex flex-wrap gap-2">
            <CopyClaimLink />
            <Link href={`/products/${product.id}/edit`} className="btn-ghost text-sm">
              Edit
            </Link>
          </div>
        </div>
      ) : (
        <>
          <TrackClaimView productId={product.id} signedIn={Boolean(user)} />
          <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm">
            <p className="font-semibold">We set up {product.name} on try my thing. This is how testers would see it.</p>
            <p className="mt-1 text-muted">Nobody sees it yet. Claim it and it goes live, and you can change anything.</p>
          </div>
        </>
      )}

      <div className="panel">
        {/* "by you": the card normally shows the builder's first name, and this is for the builder. */}
        <ProductProfile product={{ ...product, builder: "you" }} />
      </div>

      {admin ? null : me ? (
        <ClaimButton code={code} productName={product.name} />
      ) : (
        <form action={startClaim.bind(null, code)} className="space-y-2 text-center">
          <SubmitButton className="btn-primary w-full">{user ? "Finish your profile to claim it" : "Claim it"}</SubmitButton>
          <p className="hint">Sign up takes about a minute. You&apos;ll come right back here.</p>
        </form>
      )}
    </div>
  );
}
