import type { VerifiedUser } from "./types";

export const STUDIO_ADMIN_EMAIL = "enderson@carrizo.cl";
export const LEGACY_STUDIO_ADMIN_EMAIL = "enderson@inkora.cl";

export function isStudioAdmin(
  user: VerifiedUser | null | undefined,
): user is VerifiedUser {
  return user?.role === "studio_admin";
}

export function postLoginPath(
  user: VerifiedUser | null | undefined,
  studioSlug: string,
  from?: string | null,
) {
  if (isStudioAdmin(user)) {
    return "/dashboard";
  }

  if (from === "estudio") {
    return `/estudio/${studioSlug}`;
  }

  return `/estudio/${studioSlug}/subasta`;
}
