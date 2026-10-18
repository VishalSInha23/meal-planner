import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonVariants, type ButtonVariant } from "./button";
import { Spinner } from "./spinner";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> {
  // Names the button for screen readers and as its tooltip.
  label: string;
  // The icon, drawn with aria-hidden.
  children: ReactNode;
  variant?: ButtonVariant;
  // Shows a spinner in place of the icon and disables the button while an async action runs.
  loading?: boolean;
}

export function IconButton({
  label,
  variant = "secondary",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border-[1.5px] text-base font-medium transition-transform duration-100 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
