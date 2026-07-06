import type { VerifiedUser } from "./types";

export function canUseApp(sessionUser: VerifiedUser | null | undefined) {
  return Boolean(sessionUser);
}

/** Reservar turno: basta con iniciar sesión. */
export function canReserve(sessionUser: VerifiedUser | null | undefined) {
  return canUseApp(sessionUser);
}

/** Subasta en vivo: documento aprobado. */
export function canEnterAuctionRoom(
  sessionUser: VerifiedUser | null | undefined,
) {
  if (!sessionUser) return false;
  return sessionUser.verificationStatus === "verificado";
}

/** @deprecated Usa canEnterAuctionRoom para subastas. */
export function canEnterRoom(sessionUser: VerifiedUser | null | undefined) {
  return canEnterAuctionRoom(sessionUser);
}

export function canPlaceBid(sessionUser: VerifiedUser | null | undefined) {
  return canEnterAuctionRoom(sessionUser);
}

export function userAccessMessage(sessionUser: VerifiedUser | null | undefined) {
  if (!sessionUser) {
    return {
      title: "Inicia sesión",
      detail: "Entra con tu cuenta para reservar turnos y gestionar tu perfil.",
    };
  }

  if (sessionUser.verificationStatus === "verificado") {
    return {
      title: "Cuenta verificada",
      detail: "Puedes reservar turnos y pujar en subastas en vivo.",
    };
  }

  if (sessionUser.verificationStatus === "rechazado") {
    return {
      title: "Verificación rechazada",
      detail:
        "Puedes reservar turnos. Para pujar, sube un documento válido en Acceso.",
    };
  }

  if (sessionUser.verificationStatus === "en_revision") {
    return {
      title: "Documento en revisión",
      detail:
        "Puedes reservar turnos. Podrás pujar cuando el equipo apruebe tu documento.",
    };
  }

  return {
    title: "Sesión activa",
    detail:
      "Puedes reservar turnos. Sube tu documento en Acceso para pujar en subastas.",
  };
}

export function auctionAccessMessage(
  sessionUser: VerifiedUser | null | undefined,
) {
  if (!sessionUser) {
    return {
      title: "Inicia sesión",
      detail: "Entra con tu cuenta para acceder a la subasta en vivo.",
    };
  }

  if (sessionUser.verificationStatus === "verificado") {
    return {
      title: "Cuenta verificada",
      detail: "Puedes pujar en la subasta en vivo.",
    };
  }

  if (sessionUser.verificationStatus === "rechazado") {
    return {
      title: "Verificación rechazada",
      detail: "Sube un documento válido en Acceso para pujar en la subasta.",
    };
  }

  if (sessionUser.verificationStatus === "en_revision") {
    return {
      title: "Documento en revisión",
      detail:
        "Tu identidad está siendo validada. Podrás pujar cuando el equipo la apruebe.",
    };
  }

  return {
    title: "Falta verificación",
    detail: "Sube tu cédula o pasaporte en Acceso para pujar en la subasta.",
  };
}
