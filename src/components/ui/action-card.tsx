import { ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export interface ActionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  title: string;
  // One line saying what happens.
  description: string;
}

// A card that is itself the button: the whole card is clickable. For links, the same look is on the settings page.
export function ActionCard({ title, description, type = "button", className = "", ...props }: ActionCardProps) {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-between gap-4 rounded-lg border-[1.5px] border-ink p-4 text-left transition-transform duration-100 active:scale-[0.99] active:bg-ink/15 disabled:opacity-60 md:p-6 motion-reduce:transition-none ${className}`}
      {...props}
    >
      <span className="flex flex-col gap-1">
        <span className="text-xl font-semibold">{title}</span>
        <span className="text-ink/75">{description}</span>
      </span>
      <ChevronRight size={24} aria-hidden="true" />
    </button>
  );
}
