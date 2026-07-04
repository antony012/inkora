import Link from "next/link";
import { AtSign, ExternalLink } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Studio } from "@/lib/types";

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.82a4.84 4.84 0 0 1-1.01-.13z" />
    </svg>
  );
}

export function SocialStrip({ studio }: { studio: Studio }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={studio.tiktokUrl}
        target="_blank"
        rel="noreferrer"
        className="social-chip social-chip-tiktok"
      >
        <TikTokIcon size={14} />
        {studio.tiktok}
      </a>
      <a
        href={`https://instagram.com/${studio.instagram.replace("@", "")}`}
        target="_blank"
        rel="noreferrer"
        className="social-chip"
      >
        <AtSign size={14} />
        {studio.instagram}
      </a>
      <a
        href={studio.facebook}
        target="_blank"
        rel="noreferrer"
        className="social-chip"
      >
        <ExternalLink size={14} />
        Facebook
      </a>
    </div>
  );
}

export function ArtistBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5 text-xs text-[var(--text-muted)]">
      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      {BRAND.name} · {BRAND.tagline}
    </div>
  );
}
