// With "reduce motion" on, the spinner is replaced by the text "Loading…".
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`inline-block size-4 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:hidden ${className}`}
      />
      <span className="hidden motion-reduce:inline">Loading…</span>
    </>
  );
}
