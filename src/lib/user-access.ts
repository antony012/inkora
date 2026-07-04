import type { VerifiedUser } from "./types";

export function canUseApp(sessionUser: VerifiedUser | null | undefined) {
  return Boolean(sessionUser);
}

/** Pujas: basta con sesión activa; solo bloqueamos cuentas rechazadas. */
export function canPlaceBid(sessionUser: VerifiedUser | null | undefined) {
  if (!sessionUser) return false;
  return sessionUser.verificationStatus !== "rechazado";
}

export function userAccessMessage(sessionUser: VerifiedUser | null | undefined) {
  if (!sessionUser) {
    return {
      title: "Inicia sesión",
      detail: "Entra con tu cuenta para pujar, reservar y guardar tu progreso.",
    };
  }

  if (sessionUser.verificationStatus === "rechazado") {
    return {
      title: "Verificación rechazada",
      detail: "Sube un documento válido en Acceso para volver a participar.",
    };
  }

  if (sessionUser.verificationStatus === "pendiente_documento") {
    return {
      title: "Sesión activa",
      detail: "Ya puedes usar la app. Sube tu documento cuando quieras reforzar tu perfil.",
    };
  }

  if (sessionUser.verificationStatus === "en_revision") {
    return {
      title: "Sesión activa",
      detail: "Tu documento está en revisión. Mientras tanto puedes pujar y reservar.",
    };
  }

  return {
    title: "Cuenta verificada",
    detail: "Tienes acceso completo a subastas, reservas y sala en vivo.",
  };
}
