"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/lib/forms";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A form posting to a server action. Success redirects from the action; a
 * failure comes back here as a message shown above the fields.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  cancelHref,
  className,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  cancelHref?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.error) errorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className={className ?? "space-y-6"}>
      {state?.error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-tint px-4 py-3 text-[14px] text-danger"
        >
          {state.error}
        </div>
      )}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        {cancelHref && (
          <a href={cancelHref} className="btn btn-secondary">
            Cancel
          </a>
        )}
      </div>
    </form>
  );
}

export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** A one-button form that asks before deleting. */
export function DeleteButton({
  action,
  label = "Delete",
  confirm,
}: {
  action: () => Promise<ActionState | void>;
  label?: string;
  confirm: string;
}) {
  const [state, formAction] = useActionState(async () => (await action()) ?? null, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-2"
    >
      <DeleteSubmit label={label} />
      {state?.error && (
        <p role="alert" className="text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

function DeleteSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
      {pending ? "Removing…" : label}
    </button>
  );
}
