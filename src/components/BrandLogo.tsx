"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type BrandLogoProps = {
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  showImage?: boolean;
  href?: string;
  className?: string;
  variant?: "default" | "compact";
};

export function BrandLogo({
  size = 44,
  showName = true,
  showTagline = false,
  showImage = true,
  href,
  className,
  variant = "default",
}: BrandLogoProps) {
  const content = (
    <div className={cn("group flex items-center gap-3", className)}>
      {showImage ? (
        <div
          className="logo-3d-tilt relative shrink-0"
          style={{ width: size, height: size }}
        >
          <div className="logo-glow-ring absolute -inset-1 rounded-full" />
          <div className="relative h-full w-full overflow-hidden rounded-full border border-[var(--border)] bg-[#0a0a0c] shadow-[0_8px_24px_#00000066]">
            <Image
              src={BRAND.logo}
              alt={BRAND.name}
              width={size * 2}
              height={size * 2}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              priority
            />
          </div>
        </div>
      ) : null}
      {showName ? (
        <div className={variant === "compact" ? "leading-tight" : ""}>
          <p
            className={cn(
              "font-semibold tracking-wide text-white",
              variant === "compact" ? "text-sm" : "text-base",
            )}
          >
            {BRAND.name}
          </p>
          {showTagline ? (
            <p className="text-xs text-[var(--text-dim)]">{BRAND.tagline}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
