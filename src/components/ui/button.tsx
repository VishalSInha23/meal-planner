import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  // Shows a spinner and disables the button while an async action runs.
  loading?: boolean;
}

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-paper active:bg-ink/80",
  secondary: "border-ink bg-transparent text-ink active:bg-ink/15",
  ghost: "border-transparent bg-transparent text-ink active:bg-ink/15",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] px-4 text-base font-medium transition-transform duration-100 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
