import type { VerifiedUser } from "./types";
import { CARIZO_TAB_SESSION_KEY } from "./storage-keys";

function userRevision(user: VerifiedUser) {
  return Math.max(
    user.passwordUpdatedAt ? new Date(user.passwordUpdatedAt).getTime() : 0,
    user.reviewedAt ? new Date(user.reviewedAt).getTime() : 0,
    user.submittedAt ? new Date(user.submittedAt).getTime() : 0,
    new Date(user.createdAt).getTime(),
  );
}

function pickPasswordFields(a: VerifiedUser, b: VerifiedUser) {
  const aAt = a.passwordUpdatedAt
    ? new Date(a.passwordUpdatedAt).getTime()
    : 0;
  const bAt = b.passwordUpdatedAt
    ? new Date(b.passwordUpdatedAt).getTime()
    : 0;

  // Elige un lado completo: hash + plain siempre del mismo origen.
  const winner =
    bAt !== aAt
      ? bAt > aAt
        ? b
        : a
      : b.passwordPlain
        ? b
        : a;
  const other = winner === a ? b : a;

  if (winner.passwordHash && (winner.passwordPlain || !other.passwordPlain)) {
    return {
      passwordHash: winner.passwordHash,
      passwordPlain: winner.passwordPlain ?? other.passwordPlain,
      passwordUpdatedAt: winner.passwordUpdatedAt || other.passwordUpdatedAt,
    };
  }

  if (other.passwordHash) {
    return {
      passwordHash: other.passwordHash,
      passwordPlain: other.passwordPlain ?? winner.passwordPlain,
      passwordUpdatedAt: other.passwordUpdatedAt || winner.passwordUpdatedAt,
    };
  }

  return {
    passwordHash: winner.passwordHash || other.passwordHash,
    passwordPlain: winner.passwordPlain ?? other.passwordPlain,
    passwordUpdatedAt: winner.passwordUpdatedAt || other.passwordUpdatedAt,
  };
}

export function mergeUsers(
  local: VerifiedUser[],
  remote: VerifiedUser[],
): VerifiedUser[] {
  const merged = new Map<string, VerifiedUser>();

  for (const user of [...remote, ...local]) {
    const existing = merged.get(user.id);
    if (!existing) {
      merged.set(user.id, user);
      continue;
    }

    const preferIncoming = userRevision(user) >= userRevision(existing);
    const base = preferIncoming ? user : existing;
    const other = preferIncoming ? existing : user;
    const passwordFields = pickPasswordFields(existing, user);

    merged.set(user.id, {
      ...base,
      ...passwordFields,
      // Conserva documento/foto si el ganador no los trae.
      documentDataUrl: base.documentDataUrl || other.documentDataUrl,
      documentFileName: base.documentFileName || other.documentFileName,
      profilePhotoUrl: base.profilePhotoUrl || other.profilePhotoUrl,
    });
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

/** Sesión por pestaña: admin y postor pueden coexistir en el mismo navegador. */
export function readTabSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CARIZO_TAB_SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeTabSessionUserId(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) sessionStorage.setItem(CARIZO_TAB_SESSION_KEY, userId);
    else sessionStorage.removeItem(CARIZO_TAB_SESSION_KEY);
  } catch {
    // sessionStorage bloqueado.
  }
}
