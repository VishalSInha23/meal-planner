import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/generated/brand";

export function BrandLink({ className = "" }: { className?: string }) {
  const showIcon = brand.headerDisplay !== "text";
  const showText = brand.headerDisplay !== "icon";
  return (
    <Link
      href="/plan"
      aria-label={showText ? undefined : brand.name}
      className={`flex min-h-11 items-center gap-2 rounded-md ${className}`}
    >
      {showIcon && <Image src={brand.icon} alt="" width={32} height={32} unoptimized />}
      {showText && <span className="font-serif text-xl font-semibold">{brand.name}</span>}
    </Link>
  );
}
