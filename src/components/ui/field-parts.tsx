import type { ReactNode } from "react";

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-base text-ink/75">
      {children}
    </p>
  );
}

// An error shown next to the field that failed. The text says what is wrong, so colour is not needed.
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-base font-medium">
      <span aria-hidden="true">▲ </span>
      {children}
    </p>
  );
}

export const controlBorder = "border-[1.5px] border-ink";
