"use client";

import { Users, UserX } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuctionRoomUsers } from "@/hooks/useAuctionRoomUsers";
import { useCarrizo } from "@/lib/store";

type LiveRoomAudienceProps = {
  compact?: boolean;
  className?: string;
  admin?: boolean;
  kickedUserIds?: Set<string>;
  onKick?: (userId: string, name: string) => void;
  onUnkick?: (userId: string) => void;
};

export function LiveRoomAudience({
  compact = false,
  className = "",
  admin = false,
  kickedUserIds,
  onKick,
  onUnkick,
}: LiveRoomAudienceProps) {
  const studioSlug = useCarrizo((s) => s.studio.slug);
  const roomUsers = useAuctionRoomUsers(studioSlug);

  if (compact) {
    return (
      <span className={`badge badge-gold ${className}`}>
        <Users size={12} /> {roomUsers.length} en sala
      </span>
    );
  }

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h3 className="inline-flex items-center gap-2 font-medium">
          <Users size={16} className="text-[#34d399]" />
          En la sala ahora
        </h3>
        <span className="badge badge-gold">{roomUsers.length} en vivo</span>
      </div>

      <div className="max-h-64 divide-y divide-[var(--border)] overflow-auto scrollbar-thin">
        {roomUsers.length === 0 ? (
          <p className="p-5 text-sm text-[var(--text-muted)]">
            Nadie más en la sala por ahora. Sé el primero en entrar.
          </p>
        ) : (
          roomUsers.map((user) => {
            const kicked = kickedUserIds?.has(user.userId);
            return (
              <div
                key={user.userId}
                className="flex items-center gap-3 px-5 py-3"
              >
                <UserAvatar
                  name={user.name}
                  profilePhotoUrl={user.profilePhotoUrl}
                  verificationStatus={user.verificationStatus}
                  size="md"
                  showOnlineDot={!kicked}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{user.name}</p>
                    {kicked ? (
                      <span className="badge badge-rose">Expulsado</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--text-dim)]">
                    {user.email}
                  </p>
                </div>
                {admin ? (
                  kicked ? (
                    <button
                      type="button"
                      onClick={() => onUnkick?.(user.userId)}
                      className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                    >
                      Readmitir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onKick?.(user.userId, user.name)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#fb718533] px-2.5 py-1 text-xs text-[#fb7185] hover:bg-[#fb718514]"
                    >
                      <UserX size={12} />
                      Expulsar
                    </button>
                  )
                ) : (
                  <span className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#34d399]" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
