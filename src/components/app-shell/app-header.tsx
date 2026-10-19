import { BrandLink } from "./brand-link";
import { NavDrawer } from "./nav-drawer";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b-[1.5px] border-ink px-4">
      <NavDrawer />
      <BrandLink className="md:hidden" />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
