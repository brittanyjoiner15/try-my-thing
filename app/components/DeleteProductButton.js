"use client";

import SubmitButton from "@/app/components/SubmitButton";

// Hard delete can't be undone, so ask first. `action` is a server action already bound to the product id.
export default function DeleteProductButton({ action, name, className = "btn-ghost text-sm text-red-600" }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete ${name} for good? Its swipes and tester requests go with it. Chats with messages stay. This can't be undone.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <SubmitButton className={className} pendingLabel="Deleting…">
        Delete
      </SubmitButton>
    </form>
  );
}
