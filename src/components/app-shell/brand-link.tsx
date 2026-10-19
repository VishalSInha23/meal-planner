import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/generated/brand";

const showIcon = brand.headerDisplay !== "text";
const showText = brand.headerDisplay !== "icon";

export interface BrandMarkProps {
  size?: number;
  textClassName?: string;
}

// The brand as configured: icon, name, or both. The name is always there for screen readers.
export function BrandMark({ size = 40, textClassName = "text-xl" }: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2">
      {showIcon && <Image src={brand.icon} alt="" width={size} height={size} unoptimized />}
      <span className={showText ? `font-serif font-semibold ${textClassName}` : "sr-only"}>{brand.name}</span>
    </span>
  );
}

export function BrandLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/plan" className={`flex min-h-11 items-center rounded-md ${className}`}>
      <BrandMark />
    </Link>
  );
}
