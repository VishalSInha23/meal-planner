import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Shows a spinner and disables the button while an async action runs.
  loading?: boolean;
}

export function Button({ loading = false, disabled, children, className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-current px-4 text-base font-medium outline-offset-2 focus-visible:outline-2 active:bg-current/20 disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// With "reduce motion" on, the spinner is replaced by the text "Loading…".
function Spinner() {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-block size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:hidden"
      />
      <span className="hidden motion-reduce:inline">Loading…</span>
    </>
  );
}
