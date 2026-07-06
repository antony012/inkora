import Image from "next/image";
import { CarrizoArtLogo } from "@/components/CarrizoArtLogo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ConsentBrandHeaderProps = {
  studioName?: string;
  className?: string;
  centered?: boolean;
};

export function ConsentBrandHeader({
  studioName,
  className,
  centered = false,
}: ConsentBrandHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-[var(--border)] pb-5",
        centered ? "flex-col text-center" : "flex-row",
        className,
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[#0a0a0c] shadow-[0_8px_24px_#00000055]">
        <Image
          src={BRAND.logo}
          alt="Carrizo Art"
          width={128}
          height={128}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      <div className={centered ? "text-center" : "text-left"}>
        <CarrizoArtLogo
          variant="neon"
          size="sm"
          align={centered ? "center" : "left"}
          showGlow
        />
        {studioName ? (
          <p className="mt-1 text-xs text-[var(--text-dim)]">{studioName}</p>
        ) : null}
      </div>
    </div>
  );
}
