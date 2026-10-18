import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-shell/app-header";
import { Sidebar } from "@/components/app-shell/sidebar";
import { AppearanceProvider } from "@/components/appearance/appearance-provider";
import { readAppearance } from "@/lib/appearance/read-appearance";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const appearance = await readAppearance();
  return (
    <AppearanceProvider initial={appearance}>
      <Sidebar />
      <div className="md:pl-60">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl p-4 md:p-6">{children}</main>
      </div>
    </AppearanceProvider>
  );
}
