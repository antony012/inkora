import { statusLabel } from "@/lib/quote-engine";
import type { AppointmentStatus } from "@/lib/types";

const styles: Record<AppointmentStatus, string> = {
  solicitud: "badge-blue",
  cotizado: "badge-gold",
  seña_pendiente: "badge-amber",
  confirmado: "badge-green",
  en_curso: "badge-rose",
  completado: "badge-gray",
  cancelado: "badge-gray",
  no_show: "badge-rose",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`badge ${styles[status]}`}>{statusLabel(status)}</span>
  );
}
