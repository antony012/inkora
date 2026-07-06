"use client";

import { useMemo } from "react";
import { useCarrizo } from "@/lib/store";

export function useSessionUser() {
  const hydrated = useCarrizo((s) => s.hydrated);
  const sessionUserId = useCarrizo((s) => s.sessionUserId);
  const users = useCarrizo((s) => s.users);

  const sessionUser = useMemo(() => {
    if (!hydrated || !sessionUserId) return null;
    return users.find((user) => user.id === sessionUserId) ?? null;
  }, [hydrated, sessionUserId, users]);

  return { hydrated, sessionUser, sessionUserId };
}
