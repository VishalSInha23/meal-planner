import { BrandLink } from "./brand-link";
import { NavMenu } from "./nav-menu";

// Fixed menu on the left at 768 px and up. On phones the same menu is the drawer.
// The brand block has the header's height and border, so the two line up.
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col overflow-y-auto border-r-[1.5px] border-ink bg-paper md:flex">
      <div className="flex h-16 shrink-0 items-center justify-center border-b-[1.5px] border-ink">
        <BrandLink />
      </div>
      <div className="p-4">
        <NavMenu />
      </div>
    </aside>
  );
}
