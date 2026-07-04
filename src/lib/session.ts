import type { VerifiedUser } from "./types";

function userRevision(user: VerifiedUser) {
  return Math.max(
    user.reviewedAt ? new Date(user.reviewedAt).getTime() : 0,
    user.submittedAt ? new Date(user.submittedAt).getTime() : 0,
    new Date(user.createdAt).getTime(),
  );
}

export function mergeUsers(
  local: VerifiedUser[],
  remote: VerifiedUser[],
): VerifiedUser[] {
  const merged = new Map<string, VerifiedUser>();

  for (const user of [...remote, ...local]) {
    const existing = merged.get(user.id);
    if (!existing || userRevision(user) >= userRevision(existing)) {
      merged.set(user.id, user);
    }
  }

  return Array.from(merged.values());
}

export function resolveSessionUserId(
  localSessionId: string | null,
  remoteSessionId: string | null | undefined,
  users: VerifiedUser[],
) {
  const candidates = [localSessionId, remoteSessionId].filter(Boolean) as string[];

  for (const id of candidates) {
    if (users.some((user) => user.id === id)) return id;
  }

  return null;
}
