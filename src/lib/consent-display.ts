import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Appointment, ConsentForm } from "@/lib/types";

export function consentSessionLabel(
  consent: ConsentForm,
  appointment?: Appointment | null,
) {
  if (appointment) {
    return `${appointment.title} · ${format(parseISO(appointment.startAt), "d MMM yyyy HH:mm", { locale: es })}`;
  }

  if (consent.sessionTitle) {
    const datePart = consent.sessionAt
      ? ` · ${format(parseISO(consent.sessionAt), "d MMM yyyy HH:mm", { locale: es })}`
      : "";
    return `${consent.sessionTitle}${datePart}`;
  }

  return null;
}
