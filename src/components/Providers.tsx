"use client";

import { useEffect } from "react";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MarketingScripts } from "@/components/MarketingScripts";
import {
  readPersistedState,
  shouldApplyRemoteAuctions,
  subscribeAuctionLive,
} from "@/lib/live-sync";
import { mergeUsers, resolveSessionUserId } from "@/lib/session";
import { useInkora } from "@/lib/store";
import type { TattooAuction, VerifiedUser } from "@/lib/types";

export function Providers({ children }: { children: React.ReactNode }) {
  const setHydrated = useInkora((s) => s.setHydrated);

  useEffect(() => {
    if (useInkora.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useInkora.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, [setHydrated]);

  useEffect(() => {
    return subscribeAuctionLive(() => {
      const remoteState = readPersistedState<{
        auctions?: TattooAuction[];
        users?: VerifiedUser[];
        sessionUserId?: string | null;
      }>();
      if (!remoteState) return;

      const local = useInkora.getState();
      const next: Partial<typeof local> = {};

      if (
        remoteState.auctions &&
        shouldApplyRemoteAuctions(remoteState.auctions, local.auctions)
      ) {
        next.auctions = remoteState.auctions;
      }

      if (remoteState.users) {
        const mergedUsers = mergeUsers(local.users, remoteState.users);
        if (JSON.stringify(mergedUsers) !== JSON.stringify(local.users)) {
          next.users = mergedUsers;
        }
      }

      const users = next.users ?? local.users;
      const sessionUserId = resolveSessionUserId(
        local.sessionUserId,
        remoteState.sessionUserId,
        users,
      );

      if (sessionUserId !== local.sessionUserId) {
        next.sessionUserId = sessionUserId;
      }

      if (Object.keys(next).length > 0) {
        useInkora.setState(next);
      }
    });
  }, []);

  return (
    <>
      <MarketingScripts />
      {children}
      <ConsentBanner />
    </>
  );
}
