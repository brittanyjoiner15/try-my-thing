import { Spinner } from "@/app/components/SubmitButton";

// Shown right away when moving between pages (tab bar, links) while the server loads the next one.
// Sits inside the root layout, so the header and tab bar stay put.
export default function Loading() {
  return (
    <div className="flex justify-center pt-24 text-muted" role="status" aria-label="Loading">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
