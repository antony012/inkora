import { AtSign } from "lucide-react";
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

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function studioInstagramUrl(studio: Studio) {
  return (
    studio.instagramUrl ||
    `https://www.instagram.com/${studio.instagram.replace("@", "")}`
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[#0d0d10] text-[var(--text-muted)] transition hover:border-[var(--accent-glow)] hover:text-[var(--accent-glow)]";

export function SocialIconLinks({
  studio,
  className = "",
}: {
  studio: Studio;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <a
        href={studio.tiktokUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`TikTok ${studio.tiktok}`}
        title={`TikTok ${studio.tiktok}`}
        className={iconBtn}
      >
        <TikTokIcon size={15} />
      </a>
      <a
        href={studioInstagramUrl(studio)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Instagram ${studio.instagram}`}
        title={`Instagram ${studio.instagram}`}
        className={iconBtn}
      >
        <InstagramIcon size={15} />
      </a>
      <a
        href={studio.facebook}
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook"
        title="Facebook"
        className={iconBtn}
      >
        <FacebookIcon size={15} />
      </a>
    </div>
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
        href={studioInstagramUrl(studio)}
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
        <FacebookIcon size={14} />
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
