import type { VerificationStatus } from "./types";

export function verificationLabel(status: VerificationStatus) {
  const map: Record<VerificationStatus, string> = {
    pendiente_documento: "Falta documento",
    en_revision: "En revisión",
    verificado: "Verificado",
    rechazado: "Rechazado",
  };
  return map[status];
}

export function verificationBadge(status: VerificationStatus) {
  if (status === "verificado") return "badge-green";
  if (status === "en_revision") return "badge-amber";
  if (status === "rechazado") return "badge-rose";
  return "badge-gray";
}

export function canBid(status?: VerificationStatus) {
  return status === "verificado";
}
