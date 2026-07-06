import Link from "next/link";
import { cn } from "@/lib/utils";

type CarrizoArtLogoProps = {
  /** neon = blanco + naranja (logo oficial) · contrast = crema + rosa */
  variant?: "neon" | "contrast" | "studio";
  size?: "sm" | "md" | "lg" | "xl";
  subtitle?: string;
  showGlow?: boolean;
  align?: "left" | "center";
  href?: string;
  asHeading?: boolean;
  className?: string;
};

const sizes = {
  sm: "text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-5xl",
};

export function CarrizoArtLogo({
  variant = "contrast",
  size = "lg",
  subtitle,
  showGlow = true,
  align = "center",
  href,
  asHeading = false,
  className,
}: CarrizoArtLogoProps) {
  const carrizoClass =
    variant === "neon"
      ? "text-white"
      : variant === "studio"
        ? "text-[#f4f1ea]"
        : "text-[#faf8f5]";

  const artClass =
    variant === "neon"
      ? "text-[#f97316]"
      : variant === "studio"
        ? "text-[#c4a882]"
        : "text-[#fb7185]";

  const glowClass = showGlow
    ? variant === "neon"
      ? "carrizo-art-logo-glow-neon"
      : variant === "studio"
        ? "carrizo-art-logo-glow-studio"
        : "carrizo-art-logo-glow-contrast"
    : "";

  const TitleTag = asHeading ? "h1" : "p";

  const content = (
    <div
      className={cn(
        align === "left" ? "text-left" : "text-center",
        className,
      )}
    >
      {subtitle ? (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.45em] text-[var(--text-dim)]">
          {subtitle}
        </p>
      ) : null}
      <TitleTag
        className={cn(
          "font-black tracking-tight",
          sizes[size],
          glowClass,
        )}
      >
        <span className={carrizoClass}>Carrizo</span>
        <span className={artClass}>Art</span>
      </TitleTag>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 transition opacity-90 hover:opacity-100">
        {content}
      </Link>
    );
  }

  return content;
}
