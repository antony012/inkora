"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { downloadConsentPdf } from "@/lib/consent-pdf";
import type { Appointment, ConsentForm, Studio } from "@/lib/types";
import { cn } from "@/lib/utils";

type DownloadConsentPdfButtonProps = {
  studio: Studio;
  consent: ConsentForm;
  appointment?: Appointment | null;
  className?: string;
  variant?: "primary" | "secondary";
  label?: string;
};

export function DownloadConsentPdfButton({
  studio,
  consent,
  appointment,
  className,
  variant = "secondary",
  label = "Descargar PDF",
}: DownloadConsentPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const canDownload = Boolean(consent.signedAt && consent.signatureData);

  const onDownload = async () => {
    if (!canDownload || loading) return;
    setLoading(true);
    try {
      await downloadConsentPdf({ studio, consent, appointment });
    } catch (error) {
      console.error(error);
      window.alert("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!canDownload) return null;

  return (
    <button
      type="button"
      onClick={() => void onDownload()}
      disabled={loading}
      className={cn(
        variant === "primary" ? "btn-primary" : "btn-secondary",
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <Download size={16} />
      {loading ? "Generando PDF..." : label}
    </button>
  );
}
