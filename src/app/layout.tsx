import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@/config/generated/brand";
import "@/config/generated/brand-fonts";
import "@/config/generated/brand.css";
import { readAppearance } from "@/lib/appearance/read-appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  icons: { icon: brand.icon, apple: brand.icon },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { theme, font } = await readAppearance();
  return (
    <html lang="en" data-theme={theme ?? undefined} data-font={font}>
      <body>{children}</body>
    </html>
  );
}
