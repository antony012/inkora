import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { isDrawnSignature } from "@/lib/signature";
import { consentSessionLabel } from "@/lib/consent-display";
import type { Appointment, ConsentForm, Studio } from "@/lib/types";

const LEGAL_TEXT =
  "Declaro que fui informado/a sobre el procedimiento de tatuaje, riesgos posibles (infección, reacción alérgica, cicatrización irregular), cuidados posteriores y que soy mayor de edad. Autorizo al estudio a realizar el trabajo descrito y acepto que la seña no es reembolsable ante inasistencias sin aviso de 48 horas.";

export type ConsentPdfInput = {
  studio: Studio;
  consent: ConsentForm;
  appointment?: Appointment | null;
};

function fileSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildConsentPdfFileName(consent: ConsentForm) {
  const datePart = consent.signedAt
    ? format(parseISO(consent.signedAt), "yyyy-MM-dd")
    : "pendiente";
  return `consentimiento-${fileSlug(consent.clientName)}-${datePart}.pdf`;
}

export function downloadConsentPdf({
  studio,
  consent,
  appointment,
}: ConsentPdfInput) {
  if (!consent.signedAt || !consent.signatureData) {
    throw new Error("El consentimiento debe estar firmado para generar el PDF.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addLines = (
    text: string,
    fontSize = 10,
    style: "normal" | "bold" = "normal",
    gap = 5,
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const blockHeight = lines.length * (fontSize * 0.42) + gap;
    ensureSpace(blockHeight);
    doc.text(lines, margin, y);
    y += blockHeight;
  };

  addLines(studio.name, 16, "bold", 8);
  addLines("Consentimiento informado", 14, "bold", 6);
  addLines(`Cliente: ${consent.clientName}`, 11, "bold", 4);

  if (appointment) {
    addLines(
      `Sesión: ${consentSessionLabel(consent, appointment) ?? appointment.title}`,
      10,
    );
  } else if (consent.sessionTitle) {
    addLines(
      `Sesión: ${consentSessionLabel(consent) ?? consent.sessionTitle}`,
      10,
    );
  }

  if (consent.signedAt) {
    addLines(
      `Firmado el ${format(parseISO(consent.signedAt), "d MMMM yyyy 'a las' HH:mm", { locale: es })}`,
      10,
    );
  }

  addLines(`Estudio: ${studio.name} · ${studio.city}`, 10);
  addLines(`Teléfono: ${studio.phone}`, 10, "normal", 8);

  addLines("Términos del consentimiento", 11, "bold", 4);
  addLines(LEGAL_TEXT, 10);
  addLines("Cuidados posteriores", 11, "bold", 4);
  addLines(studio.aftercareText, 10);

  addLines("Declaración de salud / alergias", 11, "bold", 4);
  addLines(
    consent.healthDeclaration?.trim() || "Sin condiciones relevantes",
    10,
    "normal",
    8,
  );

  addLines("Firma del cliente", 11, "bold", 4);

  if (isDrawnSignature(consent.signatureData)) {
    ensureSpace(38);
    doc.addImage(consent.signatureData, "PNG", margin, y, 90, 32);
    y += 38;
  } else {
    doc.setFont("times", "italic");
    addLines(consent.signatureData, 14, "normal", 8);
  }

  addLines(
    "Documento generado por Carrizo. La firma digital fue registrada con fecha y hora indicadas arriba.",
    8,
    "normal",
    0,
  );

  doc.save(buildConsentPdfFileName(consent));
}
