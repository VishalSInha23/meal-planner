"use client";

import { CalendarDays, CookingPot, Settings, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/groceries", label: "Groceries", Icon: ShoppingBasket },
  { href: "/dishes", label: "Dishes", Icon: CookingPot },
  { href: "/settings", label: "Settings", Icon: Settings },
];

// The current section is bold and underlined and marked with aria-current, so it does not depend on colour.
const current = "bg-ink/10 font-semibold underline decoration-2 underline-offset-4";

export function NavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {sections.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 active:bg-ink/15 ${active ? current : ""}`}
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
