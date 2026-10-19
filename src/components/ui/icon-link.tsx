import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { buttonVariants, type ButtonVariant } from "./button";

export interface IconLinkProps extends Omit<ComponentProps<typeof Link>, "aria-label" | "title" | "children"> {
  // Names the link for screen readers and as its tooltip.
  label: string;
  // The icon, drawn with aria-hidden.
  children: ReactNode;
  variant?: ButtonVariant;
}

// A link that looks like an IconButton.
export function IconLink({ label, variant = "secondary", children, className = "", ...props }: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border-[1.5px] text-base font-medium transition-transform duration-100 active:scale-[0.97] motion-reduce:transition-none ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
