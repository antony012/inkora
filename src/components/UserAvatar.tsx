"use client";

import Image from "next/image";
import { BadgeCheck, Camera } from "lucide-react";
import type { VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const sizeMap = {
  sm: 36,
  md: 48,
  lg: 96,
  xl: 120,
} as const;

type UserAvatarProps = {
  name: string;
  profilePhotoUrl?: string;
  verificationStatus?: VerificationStatus;
  size?: keyof typeof sizeMap | number;
  showVerifiedBadge?: boolean;
  showOnlineDot?: boolean;
  className?: string;
};

export function UserAvatar({
  name,
  profilePhotoUrl,
  verificationStatus,
  size = "md",
  showVerifiedBadge = true,
  showOnlineDot = false,
  className,
}: UserAvatarProps) {
  const px = typeof size === "number" ? size : sizeMap[size];
  const verified = verificationStatus === "verificado";
  const badgeSize = Math.max(14, Math.round(px * 0.32));
  const dotSize = Math.max(8, Math.round(px * 0.22));

  const content = profilePhotoUrl ? (
    profilePhotoUrl.startsWith("data:") ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePhotoUrl}
        alt={name}
        className="h-full w-full object-cover"
      />
    ) : (
      <Image src={profilePhotoUrl} alt={name} fill className="object-cover" sizes={`${px}px`} />
    )
  ) : (
    <span
      className="flex h-full w-full items-center justify-center bg-[#141418] font-semibold text-[var(--accent-glow)]"
      style={{ fontSize: Math.max(11, px * 0.32) }}
    >
      {initials(name)}
    </span>
  );

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full border border-[var(--border)] bg-[#0a0a0c]">
        {content}
      </div>

      {showOnlineDot ? (
        <span
          className="absolute rounded-full border-2 border-[#0d0d10] bg-[#34d399]"
          style={{
            width: dotSize,
            height: dotSize,
            right: verified ? badgeSize * 0.15 : 0,
            bottom: verified ? badgeSize * 0.15 : 0,
          }}
        />
      ) : null}

      {showVerifiedBadge && verified ? (
        <span
          className="absolute flex items-center justify-center rounded-full border-2 border-[#0c0c0f] bg-[#34d399] text-[#052e1f] shadow-[0_0_12px_rgba(52,211,153,0.45)]"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: -2,
            bottom: -2,
          }}
          title="Usuario verificado"
        >
          <BadgeCheck size={Math.max(10, badgeSize - 6)} strokeWidth={2.5} />
        </span>
      ) : null}
    </div>
  );
}

type ProfilePhotoUploadProps = {
  name: string;
  profilePhotoUrl?: string;
  verificationStatus?: VerificationStatus;
  onSelect: (file: File) => void | Promise<void>;
  disabled?: boolean;
};

export function ProfilePhotoUpload({
  name,
  profilePhotoUrl,
  verificationStatus,
  onSelect,
  disabled = false,
}: ProfilePhotoUploadProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <label
        className={cn(
          "group relative inline-block cursor-pointer",
          disabled && "pointer-events-none opacity-60",
        )}
        style={{ width: 120, height: 120 }}
      >
        <UserAvatar
          name={name}
          profilePhotoUrl={profilePhotoUrl}
          verificationStatus={verificationStatus}
          size="xl"
          showOnlineDot={Boolean(profilePhotoUrl)}
        />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/45">
          <span className="flex flex-col items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <Camera size={22} className="text-white" />
            <span className="text-xs font-medium text-white">
              {profilePhotoUrl ? "Cambiar foto" : "Subir foto"}
            </span>
          </span>
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onSelect(file);
            event.target.value = "";
          }}
        />
      </label>
      <p className="text-center text-xs text-[var(--text-dim)]">
        Foto de perfil · JPG o PNG · máx. 2 MB
      </p>
    </div>
  );
}
