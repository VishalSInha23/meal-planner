import { BrandLink } from "./brand-link";
import { NavMenu } from "./nav-menu";

// Fixed menu on the left at 768 px and up. On phones the same menu is the drawer.
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-6 overflow-y-auto border-r-[1.5px] border-ink bg-paper p-4 md:flex">
      <BrandLink />
      <NavMenu />
    </aside>
  );
}
